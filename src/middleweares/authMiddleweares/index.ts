import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from "dotenv";
import { UserPayload } from '../../types/express';
import multer from 'multer';

const upload = multer().single('profileImage');
dotenv.config();

const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY) {
    throw new Error("SECRET_KEY is not defined in the environment variables");
}

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
    let { emailAddresses, password } = req.body;

  

    if (!emailAddresses) {
        return res.status(400).json({ status: 'error', message: 'paths are required.' });
    }
    if (!password) {
        return res.status(400).json({ status: 'error', message: 'password is required.' });
    }

    emailAddresses = emailAddresses.trim().toLowerCase();
    password = password.trim();

    req.body.emailAddresses = emailAddresses;
    req.body.password = password;

    next();
};

export const validateRegister = (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, (err) => {
        if (err) {
            return res.status(400).json({ status: 'error', message: 'File upload error' });
        }

        let { username, emailAddresses, password, gender } = req.body;

        // Trim and convert the email to lowercase
   

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/;

        if (!username) {
            return res.status(400).json({ status: 'error', message: 'Username is required.' });
        }

        username = username.trim();

        if (username.length > 50) {
            return res.status(400).json({ status: 'error', message: 'Username must be 50 characters or less.' });
        }
        if (!emailAddresses) {
            return res.status(400).json({ status: 'error', message: 'Email address is required.' });
        }

        emailAddresses = emailAddresses.trim().toLowerCase();

        if (!emailRegex.test(emailAddresses)) {
            return res.status(400).json({ status: 'error', message: 'Email address is not valid.' });
        }
        if (!password) {
            return res.status(400).json({ status: 'error', message: 'Password is required.' });
        }

        password = password.trim();

        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                status: 'error',
                message: 'Password must be at least 6 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.'
            });
        }
        if (!gender || !['male', 'female', 'other'].includes(gender)) {
            return res.status(400).json({ status: 'error', message: 'Gender must be either male, female, or other.' });
        }

        gender = gender.trim();

        // Update the request body with cleaned email
        req.body.emailAddresses = emailAddresses;
        req.body.gender = gender;
        req.body.username = username;
        req.body.password = password;

        next();
    });
};


export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    console.log('icxi');
    
    if (!token) return res.status(401).send({ message: "Token missing", success: 'danger' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).send({ message: "Invalid token", success: 'danger' });
        }

        // Type check to ensure user is of type JwtPayload
        if (typeof user !== 'string' && user?.id) {
            req.user = { id: user.id, email: user.email }
        } else {
            req.user = undefined;
        }

        next();
    });
};

export const validateRestPassword = (req: Request, res: Response, next: NextFunction) => {
    let { token, newPassword,confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
        return res.status(400).json({ status: 'error', message: 'Code password and new password  and confirm password are required' });
    }

    newPassword = newPassword.trim();
    token = token.trim();
    confirmPassword=confirmPassword.trim();

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ status: 'error', message: 'New password and confirm password do not match' });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ status: 'error', message: 'New password must be at least 8 characters long' });
    }

    req.body.token = token;
    req.body.newPassword = newPassword;
    req.body.confirmPassword=confirmPassword;
    
    next();
};