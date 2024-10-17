import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../utils/config/dbConnection';
import dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library';
import cloudinary from 'cloudinary';
import multer from 'multer';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import getTranslation from '../utils/translate';

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
    cloud_name: 'juste-pour-toi-mon-ami',
    api_key: '724892481592721',
    api_secret: '45HWXHiFq2QlInbGpmKM0A28yJE',
});

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const storage = multer.memoryStorage();
const upload = multer({ storage }).single('profileImage');

export const registerController = async (req: Request, res: Response) => {
    const { username, emailAddresses, password, gender } = req.body;
    const profileImage = req.file;
    const language = req.headers['accept-language'] || 'en';  // Déterminer la langue à partir de l'en-tête de requête

    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM users WHERE email = ?', [emailAddresses]);

        if (rows.length > 0) {
            connection.release();
            return res.status(400).json({ status: 'error', message: getTranslation('USER_ALREADY_EXISTS', language,'controllers','authController') });
        }

        let profileImageUrl: string | null = null;

        if (profileImage) {
            try {
                const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
                    cloudinary.v2.uploader.upload_stream({
                        folder: 'mapPoint/profile_pictures',
                        transformation: { width: 1000, height: 1000, crop: "limit" },
                        resource_type: "image"
                    }, (error, result) => {
                        if (error) reject(error);
                        else resolve(result as { secure_url: string });
                    }).end(profileImage.buffer);
                });

                profileImageUrl = result.secure_url;
            } catch (error) {
                console.error('Cloudinary error:', error);
                connection.release();
                return res.status(500).json({ status: 'error', message: getTranslation('IMAGE_UPLOAD_FAILED', language,'controllers','authController') });
            }
        } else {
            profileImageUrl = gender === 'female' 
                ? 'https://res.cloudinary.com/juste-pour-toi-mon-ami/image/upload/v1722020489/mapPoint/profile_pictures/upb08ercpavzhyi1vzhs.png' 
                : 'https://res.cloudinary.com/juste-pour-toi-mon-ami/image/upload/v1722020489/mapPoint/profile_pictures/htpon9qyg2oktamknqzz.png';
        }

        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

        const [result] = await connection.query<ResultSetHeader>(
            'INSERT INTO users (username, email, password, gender, profile_image_url, connection_type) VALUES (?, ?, ?, ?, ?, ?)',
            [username, emailAddresses, hashedPassword, gender, profileImageUrl, 'mail']
        );

        connection.release();

        const userId = result.insertId;
        const jwtToken = jwt.sign(
            { id: userId, email: emailAddresses, role: 'user' },
            SECRET_KEY
        );

        res.status(201).json({ status: 'success', message: getTranslation('USER_REGISTERED_SUCCESSFULLY', language,'controllers','authController'), token: jwtToken });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language,'controllers','authController') });
    }
};

export const loginController = async (req: Request, res: Response) => {
    const { emailAddresses, password } = req.body;
    const language = req.headers['accept-language'] || 'en';

    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM users WHERE email = ?', [emailAddresses]);

        if (rows.length === 0) {
            connection.release();
            return res.status(400).json({ status: 'error', message: getTranslation('INVALID_CREDENTIALS', language, 'controllers', 'authController') });
        }

        const user = rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            connection.release();
            return res.status(400).json({ status: 'error', message: getTranslation('INVALID_CREDENTIALS', language, 'controllers', 'authController') });
        }

        // Mise à jour du champ `last_login` avec la date et heure actuelle
        await connection.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
        connection.release();

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY);

        res.status(200).json({ status: 'success', token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'authController') });
    }
};

export const googleAuthController = async (req: Request, res: Response) => {
    const { token } = req.body;
    const language = req.headers['accept-language'] || 'en';

    try {
        console.debug('Verifying Google ID token:', token);

        const tokenSegments = token.split('.');
        if (tokenSegments.length !== 3) {
            console.error('Invalid token format');
            return res.status(400).json({ status: 'error', message: getTranslation('INVALID_TOKEN_FORMAT', language,'controllers','authController') });
        }

        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        if (!payload) {
            console.debug('Invalid token payload');
            return res.status(400).json({ status: 'error', message: getTranslation('INVALID_TOKEN', language,'controllers','authController') });
        }

        const { sub: googleId, email, name, picture } = payload;
        console.debug('Token payload:', payload);

        const connection = await pool.getConnection();
        console.debug('Database connection established');

        const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM users WHERE email = ? AND connection_type = ?', [email, 'google']);
        console.debug('User query result:', rows);

        if (rows.length === 0) {
            console.debug('User not found, creating new user');
            await connection.query(
                'INSERT INTO users (username, email, password, profile_image_url, connection_type) VALUES (?, ?, ?, ?, ?)',
                [name, email, null, picture, 'google']
            );
        }

        const [userRows] = await connection.query<RowDataPacket[]>('SELECT * FROM users WHERE email = ? AND connection_type = ?', [email, 'google']);
        const user = userRows[0];
        console.debug('User found or created:', user);
        connection.release();

        const jwtToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY);

        console.debug('JWT token generated:', jwtToken);
        res.status(200).json({ status: 'success', token: jwtToken, user: { id: user.id, email: user.email, username: user.username, profilePicture: user.profile_image_url } });
    } catch (error) {
        console.error('Internal server error:', error);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language,'controllers','authController') });
    }
};

export const bulkRegisterController = async (req: Request, res: Response) => {
    const users = req.body.users;
    const language = req.headers['accept-language'] || 'en';

    if (!Array.isArray(users) || users.length === 0) {
        return res.status(400).json({ status: 'error', message: getTranslation('NO_USERS_PROVIDED', language,'controllers','authController') });
    }

    try {
        const connection = await pool.getConnection();
        const insertValues = [];

        for (const user of users) {
            const { username, emailAddresses, password, gender, profileImage } = user;

            const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM users WHERE email = ?', [emailAddresses]);
            if (rows.length > 0) continue;

            let profileImageUrl = null;

            if (profileImage) {
                try {
                    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
                        cloudinary.v2.uploader.upload_stream({
                            folder: 'mapPoint/profile_pictures',
                            transformation: { width: 1000, height: 1000, crop: "limit" },
                            resource_type: "image"
                        }, (error, result) => {
                            if (error) reject(error);
                            else resolve(result as { secure_url: string });
                        }).end(profileImage.buffer);
                    });

                    profileImageUrl = result.secure_url;
                } catch (error) {
                    console.error('Cloudinary error:', error);
                    connection.release();
                    return res.status(500).json({ status: 'error', message: getTranslation('IMAGE_UPLOAD_FAILED', language,'controllers','authController') });
                }
            } else {
                console.log('No profile image provided.');
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

        res.status(201).json({ status: 'success', message: getTranslation('USERS_REGISTERED_SUCCESSFULLY', language,'controllers','authController').replace('{count}', `${insertValues.length}`) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language,'controllers','authController') });
    }
};

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'mailgraphnet@gmail.com',
        pass: 'mvxq xlxl fuxd vjsh'
    }
});

export const requestPasswordReset = async (req: Request, res: Response) => {
    const { email } = req.body;
    const language = req.headers['accept-language'] || 'en';

    if (!email) {
        return res.status(400).json({ status: 'error', message: getTranslation('PASSWORD_IS_REQUIRED', language,'controllers','authController') });
    }

    try {
        const connection = await pool.getConnection();
        const [userRows] = await connection.query<RowDataPacket[]>('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);

        if (userRows.length === 0) {
            connection.release();
            return res.status(400).json({ status: 'error', message: getTranslation('USER_NOT_FOUND', language,'controllers','authController') });
        }

        const user = userRows[0];
        const resetToken = crypto.randomBytes(4).toString('hex'); // 8 characters token
        const tokenExpiration = new Date(Date.now() + 3600000); // Token valid for 1 hour

        await connection.query(
            'INSERT INTO PasswordResetTokens (user_id, token, expires_at) VALUES (?, ?, ?)',
            [user.id, resetToken, tokenExpiration]
        );
        connection.release();

        const mailOptions = {
            from: '"Password Reset" <your-email@gmail.com>',
            to: email,
            subject: 'Password Reset Request',
            text: getTranslation('PASSWORD_RESET_TOKEN_SENT', language,'controllers','authController') + ' ' + resetToken
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ status: 'success', message: getTranslation('PASSWORD_RESET_TOKEN_SENT', language,'controllers','authController') });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language,'controllers','authController') });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;
    const language = req.headers['accept-language'] || 'en';

    if (!token || !newPassword) {
        return res.status(400).json({ status: 'error', message: getTranslation('TOKEN_AND_PASSWORD_REQUIRED', language,'controllers','authController') });
    }

    try {
        const connection = await pool.getConnection();
        const [tokenRows] = await connection.query<RowDataPacket[]>(
            'SELECT * FROM PasswordResetTokens WHERE token = ? AND expires_at > NOW()',
            [token]
        );

        if (tokenRows.length === 0) {
            connection.release();
            return res.status(400).json({ status: 'error', message: getTranslation('INVALID_OR_EXPIRED_TOKEN', language,'controllers','authController')});

        }

        const resetToken = tokenRows[0];
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await connection.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, resetToken.user_id]);
        await connection.query('DELETE FROM PasswordResetTokens WHERE token = ?', [token]);

        connection.release();
        res.status(200).json({ status: 'success', message: getTranslation('PASSWORD_RESET_SUCCESS', language,'controllers','authController') });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language,'controllers','authController') });
    }
};
