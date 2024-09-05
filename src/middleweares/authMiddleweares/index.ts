import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from "dotenv";
import multer from 'multer';
import getTranslation from '../../utils/translate';


const upload = multer().single('profileImage');
dotenv.config();

const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY) {
    throw new Error("SECRET_KEY is not defined in the environment variables");
}

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue
    let { emailAddresses, password } = req.body;

    if (!emailAddresses) {
        return res.status(400).json({ status: 'error', message: getTranslation('EMAIL_REQUIRED', language, 'middlewares', 'authMiddleweares') });
    }
    if (!password) {
        return res.status(400).json({ status: 'error', message: getTranslation('PASSWORD_REQUIRED', language, 'middlewares', 'authMiddleweares') });
    }

    emailAddresses = emailAddresses.trim().toLowerCase();
    password = password.trim();

    req.body.emailAddresses = emailAddresses;
    req.body.password = password;

    next();
};

export const validateRegister = (req: Request, res: Response, next: NextFunction) => {
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue
    upload(req, res, (err) => {
        if (err) {
            return res.status(400).json({ status: 'error', message: getTranslation('FILE_UPLOAD_ERROR', language, 'middlewares', 'authMiddleweares') });
        }

        let { username, emailAddresses, password, gender } = req.body;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/;

        if (!username) {
            return res.status(400).json({ status: 'error', message: getTranslation('USERNAME_REQUIRED', language, 'middlewares', 'authMiddleweares') });
        }

        username = username.trim();

        if (username.length > 50) {
            return res.status(400).json({ status: 'error', message: getTranslation('USERNAME_TOO_LONG', language, 'middlewares', 'authMiddleweares') });
        }
        if (!emailAddresses) {
            return res.status(400).json({ status: 'error', message: getTranslation('EMAIL_REQUIRED', language, 'middlewares', 'authMiddleweares') });
        }

        emailAddresses = emailAddresses.trim().toLowerCase();

        if (!emailRegex.test(emailAddresses)) {
            return res.status(400).json({ status: 'error', message: getTranslation('EMAIL_INVALID', language, 'middlewares', 'authMiddleweares') });
        }
        if (!password) {
            return res.status(400).json({ status: 'error', message: getTranslation('PASSWORD_REQUIRED', language, 'middlewares', 'authMiddleweares') });
        }

        password = password.trim();

        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                status: 'error',
                message: getTranslation('PASSWORD_WEAK', language, 'middlewares', 'authMiddleweares')
            });
        }
        if (!gender || !['male', 'female', 'other'].includes(gender)) {
            return res.status(400).json({ status: 'error', message: getTranslation('GENDER_INVALID', language, 'middlewares', 'authMiddleweares') });
        }

        gender = gender.trim();

        req.body.emailAddresses = emailAddresses;
        req.body.gender = gender;
        req.body.username = username;
        req.body.password = password;

        next();
    });
};

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ status: 'error', message: getTranslation('TOKEN_MISSING', language, 'middlewares', 'authMiddleweares') });
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(403).json({ status: 'error', message: getTranslation('TOKEN_INVALID', language, 'middlewares', 'authMiddleweares') });
        }

        const user = decoded as { id: number, email: string, role: string };

        if (user?.id) {
            req.user = { id: user.id, email: user.email, role: user.role };
        } else {
            req.user = undefined;
        }

        next();
    });
};

export const validateResetPassword = (req: Request, res: Response, next: NextFunction) => {
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue
    let { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
        return res.status(400).json({ status: 'error', message: getTranslation('RESET_PASSWORD_FIELDS_REQUIRED', language, 'middlewares', 'authMiddleweares') });
    }

    newPassword = newPassword.trim();
    token = token.trim();
    confirmPassword = confirmPassword.trim();

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ status: 'error', message: getTranslation('PASSWORDS_DO_NOT_MATCH', language, 'middlewares', 'authMiddleweares') });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ status: 'error', message: getTranslation('PASSWORD_TOO_SHORT', language, 'middlewares', 'authMiddleweares') });
    }

    req.body.token = token;
    req.body.newPassword = newPassword;
    req.body.confirmPassword = confirmPassword;

    next();
};


export const authenticateTokenAdmin = (req: Request, res: Response, next: NextFunction) => {
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ status: 'error', message: getTranslation('TOKEN_MISSING', language, 'middlewares', 'authMiddleweares') });
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(403).json({ status: 'error', message: getTranslation('TOKEN_INVALID', language, 'middlewares', 'authMiddleweares') });
        }

        const user = decoded as { id: number, email: string, role: string }; 

        // Vérification que l'utilisateur est un admin
        if (user?.role !== 'admin') {
            return res.status(403).json({ status: 'error', message: getTranslation('UNAUTHORIZED', language, 'middlewares', 'authMiddleweares') });
        }

        // Si tout est correct, on passe l'utilisateur à req.user
        req.user = { id: user.id, email: user.email, role: user.role };
        
        next();
    });
}