import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

const upload = multer().array('images');

export const validateCreateMarker = (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, (err) => {
        if (err) {
            console.log('File upload error:', err);
            
            return res.status(400).json({ status: 'error', message: 'File upload error' });
        }

        let { visibility, title, description, latitude, longitude, type, comfort_rating, noise_rating, cleanliness_rating, accessibility_rating, safety_rating, comment } = req.body;

        if (!title || !latitude || !longitude || !type || !comfort_rating || !noise_rating || !cleanliness_rating || !accessibility_rating || !safety_rating || !visibility) {
            return res.status(400).json({ status: 'error', message: 'Title, latitude, longitude, and type are required.' });
        }

        title = title.trim();
        description = description ? description.trim() : '';
        comment = comment ? comment.trim() : '';
        type = type.trim();

        if (title.length > 255) {
            return res.status(400).json({ status: 'error', message: 'Title must be 255 characters or less.' });
        }

        if (isNaN(Number(latitude)) || isNaN(Number(longitude))) {
            return res.status(400).json({ status: 'error', message: 'Latitude and longitude must be valid numbers.' });
        }

        latitude = parseFloat(latitude);
        longitude = parseFloat(longitude);

        const validTypes = ['park', 'restaurant', 'bar', 'cafe', 'museum', 'monument', 'store', 'hotel', 'beach', 'other'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ status: 'error', message: `Type must be one of the following: ${validTypes.join(', ')}.` });
        }

        const validTypesVisibility = ['private', 'friends', 'public'];

        if (!validTypesVisibility.includes(visibility)) {
            return res.status(400).json({ status: 'error', message: `Type must be one of the following: ${validTypes.join(', ')}.` });
        }

        // Optional ratings validation and calculation of overall rating
        const ratings = [comfort_rating, noise_rating, cleanliness_rating, accessibility_rating, safety_rating];
        const validRatings = ratings.filter(r => !isNaN(Number(r)) && Number(r) >= 1 && Number(r) <= 5);

        let overall_rating = null;
        if (validRatings.length > 0) {
            overall_rating = validRatings.reduce((sum, r) => sum + Number(r), 0) / validRatings.length;
        }

        req.body.title = title;
        req.body.description = description;
        req.body.latitude = latitude;
        req.body.longitude = longitude;
        req.body.type = type;
        req.body.comfort_rating = comfort_rating ? Number(comfort_rating) : null;
        req.body.noise_rating = noise_rating ? Number(noise_rating) : null;
        req.body.cleanliness_rating = cleanliness_rating ? Number(cleanliness_rating) : null;
        req.body.accessibility_rating = accessibility_rating ? Number(accessibility_rating) : null;
        req.body.safety_rating = safety_rating ? Number(safety_rating) : null;
        req.body.overall_rating = overall_rating;
        req.body.comment = comment;
        req.body.visibility = visibility;

        next();
    });
};
