import { Request, Response, NextFunction } from 'express';
import dotenv from "dotenv";
import { UserPayload } from '../../types/express';
import multer from 'multer';

const upload = multer().single('profileImage');
dotenv.config();

const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY) {
    throw new Error("SECRET_KEY is not defined in the environment variables");
}

export const validateEditeUser = (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, (err) => {
        if (err) {
            return res.status(400).json({ status: 'error', message: 'File upload error' });
        }

        let { username, gender } = req.body;



        if (!username) {
            return res.status(400).json({ status: 'error', message: 'Username is required.' });
        }
        
        username = username.trim();

        if (username.length > 50) {
            return res.status(400).json({ status: 'error', message: 'Username must be 50 characters or less.' });
        }

        gender = gender.trim();

        if (!gender || !['male', 'female', 'other'].includes(gender)) {
            return res.status(400).json({ status: 'error', message: 'Gender must be either male, female, or other.' });
        }

        req.body.username = username;
        req.body.gender = gender;

        next();
    });
};

export const validateChangePassword = (req: Request, res: Response, next: NextFunction) => {
    let { oldPassword, newPassword, confirmPassword } = req.body;


    if (!oldPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ status: 'error', message: 'Old password and new password  and confirm password are required' });
    }

    oldPassword = oldPassword.trim();
    newPassword = newPassword.trim();
    confirmPassword = confirmPassword.trim();

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ status: 'error', message: 'New password and confirm password do not match' });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ status: 'error', message: 'New password must be at least 8 characters long' });
    }



    req.body.oldPassword = oldPassword;
    req.body.newPassword = newPassword;
    req.body.confirmPassword = confirmPassword;
    next();
};