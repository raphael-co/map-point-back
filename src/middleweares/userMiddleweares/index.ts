import { Request, Response, NextFunction } from 'express';
import dotenv from "dotenv";
import { UserPayload } from '../../types/express';
import multer from 'multer';
import getTranslation from '../../utils/translate';

const upload = multer().single('profileImage');
dotenv.config();

const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY) {
    throw new Error("SECRET_KEY is not defined in the environment variables");
}

export const validateEditeUser = (req: Request, res: Response, next: NextFunction) => {
    const language = req.headers['accept-language'] || 'en';  // Déterminez la langue à partir des en-têtes de requête

    upload(req, res, (err) => {
        if (err) {
            return res.status(400).json({ 
                status: 'error', 
                message: getTranslation('FILE_UPLOAD_ERROR', language, 'middleweares', 'userMiddlewares') 
            });
        }

        let { username, gender } = req.body;

        if (!username) {
            return res.status(400).json({ 
                status: 'error', 
                message: getTranslation('USERNAME_REQUIRED', language, 'middleweares', 'userMiddlewares') 
            });
        }
        
        username = username.trim();

        if (username.length > 50) {
            return res.status(400).json({ 
                status: 'error', 
                message: getTranslation('USERNAME_TOO_LONG', language, 'middleweares', 'userMiddlewares') 
            });
        }

        if (username.length < 4) {
            return res.status(400).json({ 
                status: 'error', 
                message: getTranslation('USERNAME_TOO_SHORT', language, 'middleweares', 'userMiddlewares') 
            });
        }

        gender = gender.trim();

        if (!gender || !['male', 'female', 'other'].includes(gender)) {
            return res.status(400).json({ 
                status: 'error', 
                message: getTranslation('INVALID_GENDER', language, 'middleweares', 'userMiddlewares') 
            });
        }

        req.body.username = username;
        req.body.gender = gender;

        next();
    });
};

export const validateChangePassword = (req: Request, res: Response, next: NextFunction) => {
    const language = req.headers['accept-language'] || 'en';  // Déterminez la langue à partir des en-têtes de requête

    let { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ 
            status: 'error', 
            message: getTranslation('PASSWORD_FIELDS_REQUIRED', language, 'middleweares', 'userMiddlewares') 
        });
    }

    oldPassword = oldPassword.trim();
    newPassword = newPassword.trim();
    confirmPassword = confirmPassword.trim();

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ 
            status: 'error', 
            message: getTranslation('PASSWORD_MISMATCH', language, 'middleweares', 'userMiddlewares') 
        });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ 
            status: 'error', 
            message: getTranslation('PASSWORD_TOO_SHORT', language, 'middleweares', 'userMiddlewares') 
        });
    }

    req.body.oldPassword = oldPassword;
    req.body.newPassword = newPassword;
    req.body.confirmPassword = confirmPassword;
    next();
};
