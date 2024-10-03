import { Request, Response, NextFunction } from 'express';
import getTranslation from '../../utils/translate';
import dotenv from "dotenv";
import multer from 'multer';

const upload = multer().single('documentationFile');
dotenv.config();

export const validateDocumentation = (req: Request, res: Response, next: NextFunction) => {
    const language = 'en';

    upload(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                status: 'error',
                message: getTranslation('FILE_UPLOAD_ERROR', language, 'middleweares', 'documentationMiddleware')
            });
        }
        console.log("File details:", req.file);

        let { title } = req.body;

        // Vérification du titre
        if (!title) {
            return res.status(400).json({ status: 'error', message: getTranslation('TITLE_REQUIRED', language, 'middleweares', 'documentationMiddleware') });
        }

        title = title.trim();
        if (title.length > 255) {
            return res.status(400).json({ status: 'error', message: getTranslation('TITLE_TOO_LONG', language, 'middleweares', 'documentationMiddleware') });
        }

        // Vérification du fichier Markdown
        if (!req.file) {
            return res.status(400).json({ status: 'error', message: getTranslation('FILE_REQUIRED', language, 'middleweares', 'documentationMiddleware') });
        }

        // Nettoyage des données
        req.body.title = title;

        next();
    });
};
