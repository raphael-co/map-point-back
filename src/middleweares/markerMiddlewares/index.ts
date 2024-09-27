import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import iconv from 'iconv-lite';
import getTranslation from '../../utils/translate';

dotenv.config();

const upload = multer().array('images');

const getLanguageFromRequest = (req: Request): string => {
    return req.headers['accept-language']?.split(',')[0] || 'en'; // Utilise la première langue dans l'en-tête, ou 'en' par défaut
};

export const validateCreateMarker = (req: Request, res: Response, next: NextFunction) => {
    const language = getLanguageFromRequest(req);
    console.log("validateCreateMarker - Start", req.body);
    upload(req, res, (err) => {
        if (err) {
            console.log('File upload error:', err);
            return res.status(400).json({ status: 'error', message: getTranslation('FILE_UPLOAD_ERROR', language, 'middleweares', 'markerMiddlewares') });
        }

        if (!req.files || (req.files as Express.Multer.File[]).length < 2) {
            return res.status(400).json({ status: 'error', message: getTranslation('MINIMUM_IMAGES_REQUIRED', language, 'middleweares', 'markerMiddlewares') });
        }

        if ((req.files as Express.Multer.File[]).length > 5) {
            return res.status(400).json({ status: 'error', message: getTranslation('MAXIMUM_IMAGES_EXCEEDED', language, 'middleweares', 'markerMiddlewares') });
        }

        let { visibility, title, description, latitude, longitude, type, ratings, comment } = req.body;

        if (!title || !latitude || !longitude || !type || !visibility) {
            return res.status(400).json({ status: 'error', message: getTranslation('REQUIRED_FIELDS_MISSING', language, 'middleweares', 'validateCreateMarker') });
        }

        try {
            title = iconv.decode(Buffer.from(title.trim(), 'binary'), 'utf-8');
            description = description ? iconv.decode(Buffer.from(description.trim(), 'binary'), 'utf-8') : '';
            comment = comment ? iconv.decode(Buffer.from(comment.trim(), 'binary'), 'utf-8') : '';
            type = iconv.decode(Buffer.from(type.trim(), 'binary'), 'utf-8');
        } catch (e) {
            console.log("Error decoding URI components:", e);
            return res.status(400).json({ status: 'error', message: getTranslation('DECODING_ERROR', language, 'middleweares', 'markerMiddlewares') });
        }

        if (title.length > 255) {
            return res.status(400).json({ status: 'error', message: getTranslation('TITLE_TOO_LONG', language, 'middleweares', 'markerMiddlewares') });
        }

        if (isNaN(Number(latitude)) || isNaN(Number(longitude))) {
            return res.status(400).json({ status: 'error', message: getTranslation('INVALID_LAT_LONG', language, 'middleweares', 'markerMiddlewares') });
        }

        latitude = parseFloat(latitude);
        longitude = parseFloat(longitude);

        const validTypes = ['park', 'restaurant', 'bar', 'cafe', 'museum', 'monument', 'store', 'hotel', 'beach', 'other'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ status: 'error', message: getTranslation('INVALID_TYPE', language, 'middleweares', 'markerMiddlewares') });
        }

        const validTypesVisibility = ['private', 'friends', 'public'];
        if (!validTypesVisibility.includes(visibility)) {
            return res.status(400).json({ status: 'error', message: getTranslation('INVALID_VISIBILITY', language, 'middleweares', 'markerMiddlewares') });
        }

        if (ratings) {
            if (typeof ratings !== 'object' || Array.isArray(ratings)) {
                return res.status(400).json({ status: 'error', message: getTranslation('INVALID_RATINGS_FORMAT', language, 'middleweares', 'markerMiddlewares') });
            }

            const decodedRatings: { [key: string]: number } = {};
            for (const key in ratings) {
                try {
                    const decodedKey = iconv.decode(Buffer.from(key, 'binary'), 'utf-8');
                    const rating = Number(ratings[key]);
                    if (isNaN(rating) || rating < 1 || rating > 5) {
                        return res.status(400).json({ status: 'error', message: getTranslation('RATING_OUT_OF_RANGE', language, 'middleweares', 'markerMiddlewares').replace('{label}', decodedKey) });
                    }
                    decodedRatings[decodedKey] = rating;
                } catch (e) {
                    return res.status(400).json({ status: 'error', message: getTranslation('DECODING_RATING_LABEL_ERROR', language, 'middleweares', 'markerMiddlewares') });
                }
            }
            ratings = decodedRatings;
        }

        req.body.title = title;
        req.body.description = description;
        req.body.latitude = latitude;
        req.body.longitude = longitude;
        req.body.type = type;
        req.body.ratings = ratings;
        req.body.comment = comment;
        req.body.visibility = visibility;

        next();
    });
};

export const validateUpdateMarker = (req: Request, res: Response, next: NextFunction) => {
    const language = getLanguageFromRequest(req);
    upload(req, res, (err) => {
        if (err) {
            console.log('File upload error:', err);
            return res.status(400).json({ status: 'error', message: getTranslation('FILE_UPLOAD_ERROR', language, 'middleweares', 'markerMiddlewares') });
        }

        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ status: 'error', message: getTranslation('MARKER_ID_REQUIRED', language, 'middleweares', 'markerMiddlewares') });
        }

        if (req.files && (req.files as Express.Multer.File[]).length > 0 && (req.files as Express.Multer.File[]).length < 2) {
            return res.status(400).json({ status: 'error', message: getTranslation('MINIMUM_IMAGES_REQUIRED', language, 'middleweares', 'markerMiddlewares') });
        }

        if ((req.files as Express.Multer.File[]).length > 5) {
            return res.status(400).json({ status: 'error', message: getTranslation('MAXIMUM_IMAGES_EXCEEDED', language, 'middleweares', 'markerMiddlewares') });
        }

        let { visibility, title, description, latitude, longitude, type, ratings, comment } = req.body;

        if (!title && !latitude && !longitude && !type && !visibility && !comment && !ratings) {
            return res.status(400).json({ status: 'error', message: getTranslation('REQUIRED_FIELDS_MISSING', language, 'middleweares', 'markerMiddlewares') });
        }

        try {
            if (title) title = iconv.decode(Buffer.from(title.trim(), 'binary'), 'utf-8');
            if (description) description = iconv.decode(Buffer.from(description.trim(), 'binary'), 'utf-8');
            if (comment) comment = iconv.decode(Buffer.from(comment.trim(), 'binary'), 'utf-8');
            if (type) type = iconv.decode(Buffer.from(type.trim(), 'binary'), 'utf-8');
        } catch (e) {
            console.log("Error decoding URI components:", e);
            return res.status(400).json({ status: 'error', message: getTranslation('DECODING_ERROR', language, 'middleweares', 'markerMiddlewares') });
        }

        if (title && title.length > 255) {
            return res.status(400).json({ status: 'error', message: getTranslation('TITLE_TOO_LONG', language, 'middleweares', 'markerMiddlewares') });
        }

        if ((latitude && isNaN(Number(latitude))) || (longitude && isNaN(Number(longitude)))) {
            return res.status(400).json({ status: 'error', message: getTranslation('INVALID_LAT_LONG', language, 'middleweares', 'markerMiddlewares') });
        }

        if (latitude) latitude = parseFloat(latitude);
        if (longitude) longitude = parseFloat(longitude);

        const validTypes = ['park', 'restaurant', 'bar', 'cafe', 'museum', 'monument', 'store', 'hotel', 'beach', 'other'];
        if (type && !validTypes.includes(type)) {
            return res.status(400).json({ status: 'error', message: getTranslation('INVALID_TYPE', language, 'middleweares', 'markerMiddlewares') });
        }

        const validTypesVisibility = ['private', 'friends', 'public'];
        if (visibility && !validTypesVisibility.includes(visibility)) {
            return res.status(400).json({ status: 'error', message: getTranslation('INVALID_VISIBILITY', language, 'middleweares', 'markerMiddlewares') });
        }

        if (ratings) {
            if (typeof ratings !== 'object' || Array.isArray(ratings)) {
                return res.status(400).json({ status: 'error', message: getTranslation('INVALID_RATINGS_FORMAT', language, 'middleweares', 'markerMiddlewares') });
            }

            const decodedRatings: { [key: string]: number } = {};
            for (const key in ratings) {
                try {
                    const decodedKey = iconv.decode(Buffer.from(key, 'binary'), 'utf-8');
                    const rating = Number(ratings[key]);
                    if (isNaN(rating) || rating < 1 || rating > 5) {
                        return res.status(400).json({ status: 'error', message: getTranslation('RATING_OUT_OF_RANGE', language, 'middleweares', 'markerMiddlewares').replace('{label}', decodedKey) });
                    }
                    decodedRatings[decodedKey] = rating;
                } catch (e) {
                    return res.status(400).json({ status: 'error', message: getTranslation('DECODING_RATING_LABEL_ERROR', language, 'middleweares', 'markerMiddlewares') });
                }
            }
            ratings = decodedRatings;
        }
        req.body.title = title;
        req.body.description = description;
        req.body.latitude = latitude;
        req.body.longitude = longitude;
        req.body.type = type;
        req.body.ratings = ratings;
        req.body.comment = comment;
        req.body.visibility = visibility;

        next();
    });
};


export const validateUpdateMarkerAdmin = (req: Request, res: Response, next: NextFunction) => {
    const language = getLanguageFromRequest(req);
    upload(req, res, (err) => {
        if (err) {
            console.log('File upload error:', err);
            return res.status(400).json({ status: 'error', message: getTranslation('FILE_UPLOAD_ERROR', language, 'middleweares', 'markerMiddlewares') });
        }

        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ status: 'error', message: getTranslation('MARKER_ID_REQUIRED', language, 'middleweares', 'markerMiddlewares') });
        }

        // Log the uploaded files
        if (req.files) {
            console.log('Uploaded files:', req.files);
        } else {
            console.log('No files uploaded.');
        }

        if (req.files && (req.files as Express.Multer.File[]).length > 0 && (req.files as Express.Multer.File[]).length < 2) {
            return res.status(400).json({ status: 'error', message: getTranslation('MINIMUM_IMAGES_REQUIRED', language, 'middleweares', 'markerMiddlewares') });
        }

        if ((req.files as Express.Multer.File[]).length > 5) {
            return res.status(400).json({ status: 'error', message: getTranslation('MAXIMUM_IMAGES_EXCEEDED', language, 'middleweares', 'markerMiddlewares') });
        }

        let { visibility, title, description, latitude, longitude, type, ratings, comment, userId } = req.body;

        if (!title && !latitude && !longitude && !type && !visibility && !comment && !ratings && !userId) {
            return res.status(400).json({ status: 'error', message: getTranslation('REQUIRED_FIELDS_MISSING', language, 'middleweares', 'markerMiddlewares') });
        }

        try {
            if (title) title = iconv.decode(Buffer.from(title.trim(), 'binary'), 'utf-8');
            if (description) description = iconv.decode(Buffer.from(description.trim(), 'binary'), 'utf-8');
            if (comment) comment = iconv.decode(Buffer.from(comment.trim(), 'binary'), 'utf-8');
            if (type) type = iconv.decode(Buffer.from(type.trim(), 'binary'), 'utf-8');
            if (userId) userId = iconv.decode(Buffer.from(userId.trim(), 'binary'), 'utf-8');

        } catch (e) {
            console.log("Error decoding URI components:", e);
            return res.status(400).json({ status: 'error', message: getTranslation('DECODING_ERROR', language, 'middleweares', 'markerMiddlewares') });
        }

        if (!userId || userId == null || userId == undefined) {
            return res.status(400).json({ status: 'error', message: 'user Id empty' });

        }

        if (title && title.length > 255) {
            return res.status(400).json({ status: 'error', message: getTranslation('TITLE_TOO_LONG', language, 'middleweares', 'markerMiddlewares') });
        }

        if ((latitude && isNaN(Number(latitude))) || (longitude && isNaN(Number(longitude)))) {
            return res.status(400).json({ status: 'error', message: getTranslation('INVALID_LAT_LONG', language, 'middleweares', 'markerMiddlewares') });
        }

        if (latitude) latitude = parseFloat(latitude);
        if (longitude) longitude = parseFloat(longitude);

        const validTypes = ['park', 'restaurant', 'bar', 'cafe', 'museum', 'monument', 'store', 'hotel', 'beach', 'other'];
        if (type && !validTypes.includes(type)) {
            return res.status(400).json({ status: 'error', message: getTranslation('INVALID_TYPE', language, 'middleweares', 'markerMiddlewares') });
        }

        const validTypesVisibility = ['private', 'friends', 'public'];
        if (visibility && !validTypesVisibility.includes(visibility)) {
            return res.status(400).json({ status: 'error', message: getTranslation('INVALID_VISIBILITY', language, 'middleweares', 'markerMiddlewares') });
        }

        if (ratings) {
            if (typeof ratings !== 'object' || Array.isArray(ratings)) {
                return res.status(400).json({ status: 'error', message: getTranslation('INVALID_RATINGS_FORMAT', language, 'middleweares', 'markerMiddlewares') });
            }

            const decodedRatings: { [key: string]: number } = {};
            for (const key in ratings) {
                try {

                    const decodedKey = iconv.decode(Buffer.from(key, 'binary'), 'utf-8');
                    const rating = Number(ratings[key]);
                    if (isNaN(rating) || rating < 1 || rating > 5) {
                        return res.status(400).json({ status: 'error', message: getTranslation('RATING_OUT_OF_RANGE', language, 'middleweares', 'markerMiddlewares').replace('{label}', decodedKey) });
                    }
                    decodedRatings[decodedKey] = rating;
                } catch (e) {
                    return res.status(400).json({ status: 'error', message: getTranslation('DECODING_RATING_LABEL_ERROR', language, 'middleweares', 'markerMiddlewares') });
                }
            }
            ratings = decodedRatings;
        }
        req.body.title = title;
        req.body.description = description;
        req.body.latitude = latitude;
        req.body.longitude = longitude;
        req.body.type = type;
        req.body.ratings = ratings;
        req.body.comment = comment;
        req.body.visibility = visibility;
        req.body.userId = userId

        next();
    });
};