import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import iconv from 'iconv-lite';

dotenv.config();

const upload = multer().array('images');

export const validateCreateMarker = (req: Request, res: Response, next: NextFunction) => {
    console.log("validateCreateMarker - Start", req.body);
    upload(req, res, (err) => {
        if (err) {
            console.log('File upload error:', err);
            return res.status(400).json({ status: 'error', message: 'File upload error' });
        }

        let { visibility, title, description, latitude, longitude, type, ratings, comment } = req.body;

        if (!title || !latitude || !longitude || !type || !visibility) {
            return res.status(400).json({ status: 'error', message: 'Title, latitude, longitude, type, and visibility are required.' });
        }

        try {
            // Utiliser iconv pour s'assurer que les champs sont correctement décodés en UTF-8
            title = iconv.decode(Buffer.from(title.trim(), 'binary'), 'utf-8');
            description = description ? iconv.decode(Buffer.from(description.trim(), 'binary'), 'utf-8') : '';
            comment = comment ? iconv.decode(Buffer.from(comment.trim(), 'binary'), 'utf-8') : '';
            type = iconv.decode(Buffer.from(type.trim(), 'binary'), 'utf-8');

            console.log("Decoded title:", title);
            console.log("Decoded description:", description);
            console.log("Decoded comment:", comment);
            console.log("Decoded type:", type);
        } catch (e) {
            console.log("Error decoding URI components:", e);
            return res.status(400).json({ status: 'error', message: 'Error decoding input fields.' });
        }

        if (title.length > 255) {
            console.log("Title length validation failed");
            return res.status(400).json({ status: 'error', message: 'Title must be 255 characters or less.' });
        }

        if (isNaN(Number(latitude)) || isNaN(Number(longitude))) {
            console.log("Latitude/Longitude validation failed");
            return res.status(400).json({ status: 'error', message: 'Latitude and longitude must be valid numbers.' });
        }

        latitude = parseFloat(latitude);
        longitude = parseFloat(longitude);

        console.log("Parsed latitude:", latitude);
        console.log("Parsed longitude:", longitude);

        const validTypes = ['park', 'restaurant', 'bar', 'cafe', 'museum', 'monument', 'store', 'hotel', 'beach', 'other'];
        if (!validTypes.includes(type)) {
            console.log("Type validation failed");
            return res.status(400).json({ status: 'error', message: `Type must be one of the following: ${validTypes.join(', ')}.` });
        }

        const validTypesVisibility = ['private', 'friends', 'public'];
        if (!validTypesVisibility.includes(visibility)) {
            console.log("Visibility validation failed");
            return res.status(400).json({ status: 'error', message: `Visibility must be one of the following: ${validTypesVisibility.join(', ')}.` });
        }

        console.log("Ratings:", ratings);

        if (ratings) {
            if (typeof ratings !== 'object' || Array.isArray(ratings)) {
                console.log("Ratings type validation failed");
                return res.status(400).json({ status: 'error', message: 'Ratings must be an object with label-value pairs.' });
            }

            const decodedRatings: { [key: string]: number } = {};
            for (const key in ratings) {
                try {
                    const decodedKey = iconv.decode(Buffer.from(key, 'binary'), 'utf-8');
                    const rating = Number(ratings[key]);
                    if (isNaN(rating) || rating < 1 || rating > 5) {
                        console.log(`Rating validation failed for ${decodedKey}`);
                        return res.status(400).json({ status: 'error', message: `Rating for ${decodedKey} must be a number between 1 and 5.` });
                    }
                    decodedRatings[decodedKey] = rating; // Update the ratings object with decoded keys
                    console.log(`Decoded key: ${decodedKey}, Rating: ${rating}`);
                } catch (e) {
                    console.log("Error decoding key:", e);
                    return res.status(400).json({ status: 'error', message: 'Error decoding rating labels.' });
                }
            }
            ratings = decodedRatings; // Replace the original ratings with decoded ratings
        }

        req.body.title = title;
        req.body.description = description;
        req.body.latitude = latitude;
        req.body.longitude = longitude;
        req.body.type = type;
        req.body.ratings = ratings; // Les ratings sont maintenant un objet avec des labels et leurs valeurs
        req.body.comment = comment;
        req.body.visibility = visibility;

        console.log("Validation passed", req.body);
        next();
    });
};
