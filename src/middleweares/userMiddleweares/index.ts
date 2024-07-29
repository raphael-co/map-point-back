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

export const validateEditeUser= (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, (err) => {
        if (err) {
            return res.status(400).json({ status: 'error', message: 'File upload error' });
        }

        const { username, gender } = req.body;

        // const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/;

        if (!username) {
            return res.status(400).json({ status: 'error', message: 'Username is required.' });
        }
        if (username.length > 50) {
            return res.status(400).json({ status: 'error', message: 'Username must be 50 characters or less.' });
        }
        if (!gender || !['male', 'female', 'other'].includes(gender)) {
            return res.status(400).json({ status: 'error', message: 'Gender must be either male, female, or other.' });
        }

        next();
    });
};

export const validateChangePassword = (req: Request, res: Response, next: NextFunction) => {
    const { oldPassword, newPassword,confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ status: 'error', message: 'Old password and new password  and confirm password are required' });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ status: 'error', message: 'New password and confirm password do not match' });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ status: 'error', message: 'New password must be at least 8 characters long' });
    }

    next();
};