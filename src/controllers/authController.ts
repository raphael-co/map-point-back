import { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../utils/config/dbConnection';
import dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library';
import cloudinary from 'cloudinary';

dotenv.config();

const SECRET_KEY = process.env.SECRET_KEY;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

if (!SECRET_KEY) {
    throw new Error("SECRET_KEY is not defined in the environment variables");
}

if (!GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CLIENT_ID is not defined in the environment variables");
}

// Configurez Cloudinary avec vos informations d'identification
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export const registerController = async (req: Request, res: Response) => {
    const { username, emailAddresses, password, gender, profileImage } = req.body;

    console.log('ICI');
    
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM users WHERE email = ?', [emailAddresses]);
        console.log(rows);

        if (rows.length > 0) {
            connection.release();
            return res.status(400).json({ status: 'error', message: 'User already exists' });
        }

        let profileImageUrl = null;

        // Upload de l'image de profil sur Cloudinary si fournie
        if (profileImage) {
            const uploadResult = await cloudinary.v2.uploader.upload(profileImage, {
                folder: 'mapPoint/profile_pictures',
            });
            profileImageUrl = uploadResult.secure_url;
        }
        console.log(profileImage);

        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

        const [result] = await connection.query<ResultSetHeader>(
            'INSERT INTO users (username, email, password, gender, profile_image_url, connection_type) VALUES (?, ?, ?, ?, ?, ?)', 
            [username, emailAddresses, hashedPassword, gender, profileImageUrl, 'mail']
        );
        
        connection.release();

        const userId = result.insertId;

        const jwtToken = jwt.sign({ id: userId, email: emailAddresses }, SECRET_KEY, { expiresIn: '1h' });
        
        res.status(201).json({ status: 'success', message: 'User registered successfully', token: jwtToken });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

export const loginController = async (req: Request, res: Response) => {
    const { emailAddresses, password } = req.body;

    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM users WHERE email = ?', [emailAddresses]);
        connection.release();
        
        if (rows.length === 0) {
            return res.status(400).json({ status: 'error', message: 'Invalid credentials' });
        }

        const user = rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ status: 'error', message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });
        res.status(200).json({ status: 'success', token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

export const googleAuthController = async (req: Request, res: Response) => {
    const { token } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        if (!payload) {
            return res.status(400).json({ status: 'error', message: 'Invalid token' });
        }

        const { sub: googleId, email, name, picture } = payload;

        const connection = await pool.getConnection();
        const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM users WHERE email = ?', [email]);
        
        if (rows.length === 0) {
            await connection.query(
                'INSERT INTO users (username, email, password, profile_image_url, connection_type) VALUES (?, ?, ?, ?, ?)', 
                [name, email, null, picture, 'google']
            );
        }

        const [userRows] = await connection.query<RowDataPacket[]>('SELECT * FROM users WHERE email = ?', [email]);
        const user = userRows[0];
        connection.release();

        const jwtToken = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });
        res.status(200).json({ status: 'success', token: jwtToken, user: { id: user.id, email: user.email, username: user.username, profilePicture: user.profile_image_url } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

export const bulkRegisterController = async (req: Request, res: Response) => {
    const users = req.body.users;

    if (!Array.isArray(users) || users.length === 0) {
        return res.status(400).json({ status: 'error', message: 'No users provided for registration' });
    }

    try {
        const connection = await pool.getConnection();
        const insertValues = [];

        for (const user of users) {
            const { username, emailAddresses, password, gender, profileImage } = user;

            const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM users WHERE email = ?', [emailAddresses]);
            if (rows.length > 0) continue;

            let profileImageUrl = null;

            console.log(profileImage);
            
            // Upload de l'image de profil sur Cloudinary si fournie
            if (profileImage) {
                const uploadResult = await cloudinary.v2.uploader.upload(profileImage, {
                    folder: 'profile_pictures',
                });
                profileImageUrl = uploadResult.secure_url;
            }

            const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
            insertValues.push([username, emailAddresses, hashedPassword, gender, profileImageUrl, 'mail']);
        }

        if (insertValues.length > 0) {
            await connection.query<ResultSetHeader>(
                'INSERT INTO users (username, email, password, gender, profile_image_url, connection_type) VALUES ?', 
                [insertValues]
            );
        }

        connection.release();

        res.status(201).json({ status: 'success', message: `${insertValues.length} users registered successfully` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
