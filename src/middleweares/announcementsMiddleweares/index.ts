import { Request, Response, NextFunction } from 'express';
import getTranslation from '../../utils/translate';
import dotenv from "dotenv";
import multer from 'multer';

const upload = multer().single('announcementFile');
dotenv.config();

export const validateAnnouncement = (req: Request, res: Response, next: NextFunction) => {
    const language = 'en';

    upload(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                status: 'error',
                message: getTranslation('FILE_UPLOAD_ERROR', language, 'middleweares', 'announcementMiddleware')
            });
        }
        console.log("File details:", req.file);

        let { title } = req.body;

        // Vérification du titre
        if (!title) {
            return res.status(400).json({ status: 'error', message: getTranslation('TITLE_REQUIRED', language, 'middleweares', 'announcementMiddleware') });
        }

        title = title.trim();
        if (title.length > 255) {
            return res.status(400).json({ status: 'error', message: getTranslation('TITLE_TOO_LONG', language, 'middleweares', 'announcementMiddleware') });
        }

        // Vérification du fichier Markdown
        if (!req.file) {
            return res.status(400).json({ status: 'error', message: getTranslation('FILE_REQUIRED', language, 'middleweares', 'announcementMiddleware') });
        }

        
        // Nettoyage des données
        req.body.title = title;

        next();
    });
};