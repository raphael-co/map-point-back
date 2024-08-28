import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../utils/config/dbConnection';
import cloudinary from 'cloudinary';
import dotenv from 'dotenv';
import heicConvert from 'heic-convert';
import bcrypt from 'bcryptjs';
import getTranslation from '../utils/translate'; // Importer la fonction de traduction

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

export const getUserAuth = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue à partir de l'en-tête de requête

    if (!userId) {
        return res.status(401).json({ status: 'error', message: getTranslation('UNAUTHORIZED', language, 'controllers', 'userController') });
    }

    try {
        const connection = await pool.getConnection();

        // Retrieve user information
        const [userRows] = await connection.query<RowDataPacket[]>(
            'SELECT id, username, email, gender, profile_image_url, joined_at, last_login FROM users WHERE id = ?',
            [userId]
        );

        if (userRows.length === 0) {
            connection.release();
            return res.status(404).json({ status: 'error', message: getTranslation('USER_NOT_FOUND', language, 'controllers', 'userController') });
        }

        const user = userRows[0];

        // Count followers with 'accepted' status
        const [followerCountRows] = await connection.query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM followers WHERE user_id = ? AND status = "accepted"',
            [userId]
        );
        const followerCount = followerCountRows[0].count;

        // Count followings with 'accepted' status
        const [followingCountRows] = await connection.query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM followings WHERE user_id = ? AND status = "accepted"',
            [userId]
        );
        const followingCount = followingCountRows[0].count;

        const [nbMarker] = await connection.query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM Markers WHERE user_id = ?',
            [userId]
        );
        const nbMarkerCount = nbMarker[0].count;

        connection.release();

        res.status(200).json({
            status: 'success',
            user: {
                ...user,
                followers: followerCount,
                followings: followingCount,
                nbMarkerCount: nbMarkerCount
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'userController') });
    }
};

export const getAllUsers = async (req: Request, res: Response) => {
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue à partir de l'en-tête de requête

    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query<RowDataPacket[]>('SELECT id, username, email, gender FROM users');
        connection.release();

        if (rows.length === 0) {
            return res.status(404).json({ status: 'error', message: getTranslation('NO_USERS_FOUND', language, 'controllers', 'userController') });
        }

        res.status(200).json({ status: 'success', users: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'userController') });
    }
};

export const getAllUsersExceptCurrent = async (req: Request, res: Response) => {
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue à partir de l'en-tête de requête

    try {
        const userId = req.user!.id;
        const { username, email, gender, page = 1, limit = 10 } = req.query;

        const offset = (Number(page) - 1) * Number(limit);

        let query = 'SELECT id, username, email, gender, profile_image_url FROM users WHERE id != ?';
        let queryParams: (string | number)[] = [userId];

        if (typeof username === 'string') {
            query += ' AND username LIKE ?';
            queryParams.push(`%${username}%`);
        }

        if (typeof email === 'string') {
            query += ' AND email LIKE ?';
            queryParams.push(`%${email}%`);
        }

        if (typeof gender === 'string') {
            query += ' AND gender = ?';
            queryParams.push(gender);
        }

        query += ' LIMIT ? OFFSET ?';
        queryParams.push(Number(limit), offset);

        const connection = await pool.getConnection();
        const [rows] = await connection.query<RowDataPacket[]>(query, queryParams);
        connection.release();

        if (rows.length === 0) {
            return res.status(404).json({ status: 'error', message: getTranslation('NO_USERS_FOUND', language, 'controllers', 'userController') });
        }

        res.status(200).json({ status: 'success', users: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'userController') });
    }
};

export const getUserById = async (req: Request, res: Response) => {
    const userId = req.params.id;
    const currentUserId = req.user?.id;
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue à partir de l'en-tête de requête

    if (!currentUserId) {
        return res.status(401).json({ status: 'error', message: getTranslation('UNAUTHORIZED', language, 'controllers', 'userController') });
    }

    try {
        const connection = await pool.getConnection();

        const [userRows] = await connection.query<RowDataPacket[]>('SELECT id, username, email, gender, profile_image_url, joined_at, last_login FROM users WHERE id = ?', [userId]);

        if (userRows.length === 0) {
            connection.release();
            return res.status(404).json({ status: 'error', message: getTranslation('USER_NOT_FOUND', language, 'controllers', 'userController') });
        }

        const user = userRows[0];

        const [followerCountRows] = await connection.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM followers WHERE user_id = ? AND status = "accepted"', [userId]);
        const followerCount = followerCountRows[0].count;

        const [followingCountRows] = await connection.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM followings WHERE user_id = ? AND status = "accepted"', [userId]);
        const followingCount = followingCountRows[0].count;

        const [isFollowingRows] = await connection.query<RowDataPacket[]>('SELECT status FROM followings WHERE user_id = ? AND following_id = ?', [currentUserId, userId]);
        const isFollowing = isFollowingRows.length > 0 && isFollowingRows[0].status === 'accepted';

        const [followRequestRows] = await connection.query<RowDataPacket[]>('SELECT status FROM followings WHERE user_id = ? AND following_id = ?', [currentUserId, userId]);
        const hasRequestedFollow = followRequestRows.length > 0 && followRequestRows[0].status === 'pending';

        const [nbMarker] = await connection.query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM Markers WHERE user_id = ? ',
            [userId]
        );
        const nbMarkerCount = nbMarker[0].count;
        connection.release();

        res.status(200).json({
            status: 'success',
            user: {
                ...user,
                followers: followerCount,
                followings: followingCount,
                isFollowing,
                hasRequestedFollow,
                nbMarkerCount: nbMarkerCount
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'userController') });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue à partir de l'en-tête de requête

    try {
        const connection = await pool.getConnection();

        await connection.beginTransaction();

        await connection.query('DELETE FROM followings WHERE user_id = ? OR following_id = ?', [userId, userId]);
        await connection.query('DELETE FROM followers WHERE user_id = ? OR follower_id = ?', [userId, userId]);
        await connection.query('DELETE FROM posts WHERE user_id = ?', [userId]);
        await connection.query('DELETE FROM users WHERE id = ?', [userId]);

        await connection.commit();
        connection.release();

        res.status(200).json({ status: 'success', message: getTranslation('USER_DELETED_SUCCESS', language, 'controllers', 'userController') });
    } catch (error) {
        console.error(error);
        const connection = await pool.getConnection();

        if (connection) {
            await connection.rollback();
            connection.release();
        }

        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'userController') });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { username, gender } = req.body;
    const profileImage = req.file;
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue à partir de l'en-tête de requête

    console.log('Starting updateUser function');
    console.log('User ID:', userId);
    console.log('Username:', username);
    console.log('Gender:', gender);
    console.log('Profile image:', profileImage ? 'Provided' : 'Not provided');

    if (!userId) {
        console.log('No user ID found. Unauthorized access attempt.');
        return res.status(401).json({ status: 'error', message: getTranslation('UNAUTHORIZED', language, 'controllers', 'userController') });
    }

    try {
        const connection = await pool.getConnection();
        console.log('Database connection established.');

        const [userRows] = await connection.query<RowDataPacket[]>('SELECT profile_image_url FROM users WHERE id = ?', [userId]);
        const currentProfileImageUrl = userRows[0]?.profile_image_url || null;
        console.log('Current profile image URL:', currentProfileImageUrl);

        const fields = [];
        const values = [];

        if (username) {
            fields.push('username = ?');
            values.push(username);
        }

        if (gender) {
            fields.push('gender = ?');
            values.push(gender);
        }

        let buffer = profileImage?.buffer;

        if (profileImage) {
            if (profileImage.mimetype === 'image/heic' || profileImage.mimetype === 'image/heif') {
                try {
                    buffer = await heicConvert({
                        buffer: buffer as Buffer,
                        format: 'JPEG',
                        quality: 0.8
                    }) as Buffer;
                } catch (error) {
                    console.error('Error converting HEIC/HEIF image:', error);
                    connection.release();
                    return res.status(500).json({ status: 'error', message: getTranslation('HEIC_CONVERT_ERROR', language, 'controllers', 'userController') });
                }
            }

            try {
                console.log('Uploading new profile image to Cloudinary.');
                const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
                    cloudinary.v2.uploader.upload_stream({
                        folder: 'mapPoint/profile_pictures',
                        transformation: { width: 1000, height: 1000, crop: "limit", quality: "auto:low", fetch_format: "auto" },
                        resource_type: "image"
                    }, (error, result) => {
                        if (error) {
                            console.error('Cloudinary upload error:', error);
                            reject(error);
                        } else {
                            console.log('Cloudinary upload successful:', result!.secure_url);
                            resolve(result as { secure_url: string });
                        }
                    }).end(buffer);
                });

                fields.push('profile_image_url = ?');
                values.push(result.secure_url);

                if (currentProfileImageUrl &&
                    !currentProfileImageUrl.includes('htpon9qyg2oktamknqzz') &&
                    !currentProfileImageUrl.includes('upb08ercpavzhyi1vzhs')) {
                    const publicId = currentProfileImageUrl.split('/').pop().split('.')[0];
                    console.log('Deleting old image from Cloudinary. Public ID:', publicId);

                    cloudinary.v2.uploader.destroy(`mapPoint/profile_pictures/${publicId}`, (error, result) => {
                        if (error) console.error('Error deleting old image:', error);
                    });
                }
            } catch (error) {
                console.error('Cloudinary error:', error);
                connection.release();
                return res.status(500).json({ status: 'error', message: getTranslation('IMAGE_UPLOAD_FAILED', language, 'controllers', 'userController') });
            }
        } else {
            let profileImageUrl: string;
            if (gender === 'female') {
                profileImageUrl = 'https://res.cloudinary.com/juste-pour-toi-mon-ami/image/upload/v1722020489/mapPoint/profile_pictures/upb08ercpavzhyi1vzhs.png';
            } else {
                profileImageUrl = 'https://res.cloudinary.com/juste-pour-toi-mon-ami/image/upload/v1722020489/mapPoint/profile_pictures/htpon9qyg2oktamknqzz.png';
            }
            console.log('Setting default profile image URL:', profileImageUrl);

            fields.push('profile_image_url = ?');
            values.push(profileImageUrl);
        }

        if (fields.length === 0) {
            console.log('No fields to update. Aborting.');
            connection.release();
            return res.status(400).json({ status: 'error', message: getTranslation('NO_FIELDS_TO_UPDATE', language, 'controllers', 'userController') });
        }

        const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
        values.push(userId);

        console.log('Executing update query:', query, values);
        await connection.query(query, values);

        const [updatedUserRows] = await connection.query<RowDataPacket[]>(
            'SELECT id, username, email, gender, profile_image_url, joined_at, last_login FROM users WHERE id = ?',
            [userId]
        );
        const updatedUser = updatedUserRows[0];

        const [followerCountRows] = await connection.query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM followers WHERE user_id = ? AND status = "accepted"',
            [userId]
        );
        const followerCount = followerCountRows[0].count;

        const [followingCountRows] = await connection.query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM followings WHERE user_id = ? AND status = "accepted"',
            [userId]
        );
        const followingCount = followingCountRows[0].count;

        connection.release();

        console.log('User update successful.');
        res.status(200).json({
            status: 'success',
            message: getTranslation('USER_UPDATED_SUCCESS', language, 'controllers', 'userController'),
            user: {
                ...updatedUser,
                followers: followerCount,
                followings: followingCount,
            }
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'userController') });
    }
};

export const changePassword = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { oldPassword, newPassword } = req.body;
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue à partir de l'en-tête de requête

    if (!userId) {
        return res.status(401).json({ status: 'error', message: getTranslation('UNAUTHORIZED', language, 'controllers', 'userController') });
    }

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ status: 'error', message: getTranslation('OLD_AND_NEW_PASSWORD_REQUIRED', language, 'controllers', 'userController') });
    }

    try {
        const connection = await pool.getConnection();

        const [userRows] = await connection.query<RowDataPacket[]>(
            'SELECT password FROM users WHERE id = ?',
            [userId]
        );

        if (userRows.length === 0) {
            connection.release();
            return res.status(404).json({ status: 'error', message: getTranslation('USER_NOT_FOUND', language, 'controllers', 'userController') });
        }

        const user = userRows[0];

        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordValid) {
            connection.release();
            return res.status(400).json({ status: 'error', message: getTranslation('INCORRECT_OLD_PASSWORD', language, 'controllers', 'userController') });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await connection.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedNewPassword, userId]
        );

        connection.release();

        res.status(200).json({ status: 'success', message: getTranslation('PASSWORD_UPDATED_SUCCESS', language, 'controllers', 'userController') });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'userController') });
    }
};
