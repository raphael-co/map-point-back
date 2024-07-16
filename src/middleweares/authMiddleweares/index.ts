import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from "dotenv";
import { UserPayload } from '../../types/express';

dotenv.config();

const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY) {
    throw new Error("SECRET_KEY is not defined in the environment variables");
}

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
    const { emailAddresses, password } = req.body;

    console.log(req.body);
    console.log(emailAddresses);

    if (!emailAddresses) {
        return res.status(400).json({ status: 'error', message: 'paths are required.' });
    }
    if (!password) {
        return res.status(400).json({ status: 'error', message: 'password is required.' });
    }

    next();
};

export const validateRegister = (req: Request, res: Response, next: NextFunction) => {
    const { username, emailAddresses, password, gender } = req.body;

    console.log(req.body);
    console.log(emailAddresses);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/;

    if (!username) {
        return res.status(400).json({ status: 'error', message: 'Username is required.' });
    }
    if (username.length > 50) {
        return res.status(400).json({ status: 'error', message: 'Username must be 50 characters or less.' });
    }
    if (!emailAddresses) {
        return res.status(400).json({ status: 'error', message: 'Email address is required.' });
    }
    if (!emailRegex.test(emailAddresses)) {
        return res.status(400).json({ status: 'error', message: 'Email address is not valid.' });
    }
    if (!password) {
        return res.status(400).json({ status: 'error', message: 'Password is required.' });
    }
    if (!passwordRegex.test(password)) {
        return res.status(400).json({
            status: 'error',
            message: 'Password must be at least 6 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.'
        });
    }
    if (!gender || !['male', 'female', 'other'].includes(gender)) {
        return res.status(400).json({ status: 'error', message: 'Gender must be either male, female, or other.' });
    }

    next();
};

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).send({ message: "Token missing", success: 'danger' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).send({ message: "Invalid token", success: 'danger' });
        }
        
        // Type check to ensure user is of type JwtPayload
        if (typeof user !== 'string' && user?.id) {
            req.user = user.id as UserPayload;
        } else {
            req.user = undefined;
        }

        next();
    });
};