import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../utils/config/dbConnection';
import cloudinary from 'cloudinary';
import dotenv from 'dotenv';
import multer from 'multer';

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

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
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
            return res.status(404).json({ status: 'error', message: 'User not found' });
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

        connection.release();

        res.status(200).json({
            status: 'success',
            user: {
                ...user,
                followers: followerCount,
                followings: followingCount,
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};


export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query<RowDataPacket[]>('SELECT id, username, email, gender FROM users');
        connection.release();

        if (rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'No users found' });
        }

        res.status(200).json({ status: 'success', users: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

export const getAllUsersExceptCurrent = async (req: Request, res: Response) => {
    try {
        // Assurez-vous que req.user est typé correctement
        const userId = req.user!.id;
        const { username, email, gender, page = 1, limit = 10 } = req.query;

        const offset = (Number(page) - 1) * Number(limit);

        let query = 'SELECT id, username, email, gender, profile_image_url FROM users WHERE id != ?';
        let queryParams: (string | number)[] = [userId];

        // Vérifiez les types et castings des paramètres de requête
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
            return res.status(404).json({ status: 'error', message: 'No users found' });
        }

        res.status(200).json({ status: 'success', users: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

export const getUserById = async (req: Request, res: Response) => {
    const userId = req.params.id;
    const currentUserId = req.user?.id; // Supposons que l'ID de l'utilisateur authentifié est stocké dans req.user.id

    if (!currentUserId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        const connection = await pool.getConnection();

        // Récupérer les informations de l'utilisateur
        const [userRows] = await connection.query<RowDataPacket[]>('SELECT id, username, email, gender, profile_image_url, joined_at, last_login FROM users WHERE id = ?', [userId]);

        if (userRows.length === 0) {
            connection.release();
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        const user = userRows[0];

        // Compter le nombre de followers avec le statut 'accepted'
        const [followerCountRows] = await connection.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM followers WHERE user_id = ? AND status = "accepted"', [userId]);
        const followerCount = followerCountRows[0].count;

        // Compter le nombre de followings avec le statut 'accepted'
        const [followingCountRows] = await connection.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM followings WHERE user_id = ? AND status = "accepted"', [userId]);
        const followingCount = followingCountRows[0].count;

        // Vérifier si le currentUserId suit déjà l'utilisateur avec le statut 'accepted'
        const [isFollowingRows] = await connection.query<RowDataPacket[]>('SELECT status FROM followings WHERE user_id = ? AND following_id = ?', [currentUserId, userId]);


        const isFollowing = isFollowingRows.length > 0 && isFollowingRows[0].status === 'accepted';

        // Vérifier si le currentUserId a envoyé une demande de suivi en attente (statut 'pending')
        const [followRequestRows] = await connection.query<RowDataPacket[]>('SELECT status FROM followings WHERE user_id = ? AND following_id = ?', [currentUserId, userId]);
        const hasRequestedFollow = followRequestRows.length > 0 && followRequestRows[0].status === 'pending';

        connection.release();

        res.status(200).json({
            status: 'success',
            user: {
                ...user,
                followers: followerCount,
                followings: followingCount,
                isFollowing,
                hasRequestedFollow
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};


export const deleteUser = async (req: Request, res: Response) => {
    const userId = req.user?.id;

    try {
        const connection = await pool.getConnection();

        // Start transaction
        await connection.beginTransaction();

        // Delete all followings related to the user
        await connection.query('DELETE FROM followings WHERE user_id = ? OR following_id = ?', [userId, userId]);

        // Delete all followers related to the user
        await connection.query('DELETE FROM followers WHERE user_id = ? OR follower_id = ?', [userId, userId]);

        // Delete all posts related to the user (assuming a posts table exists)
        await connection.query('DELETE FROM posts WHERE user_id = ?', [userId]);

        // Delete the user
        await connection.query('DELETE FROM users WHERE id = ?', [userId]);

        // Commit transaction
        await connection.commit();
        connection.release();

        res.status(200).json({ status: 'success', message: 'User deleted successfully' });
    } catch (error) {
        console.error(error);
        const connection = await pool.getConnection();

        if (connection) {
            await connection.rollback();
            connection.release();
        }

        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
export const updateUser = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { username, gender } = req.body;
    const profileImage = req.file;

    console.log('Starting updateUser function');
    console.log('User ID:', userId);
    console.log('Username:', username);
    console.log('Gender:', gender);
    console.log('Profile image:', profileImage ? 'Provided' : 'Not provided');

    if (!userId) {
        console.log('No user ID found. Unauthorized access attempt.');
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        const connection = await pool.getConnection();
        console.log('Database connection established.');

        // Get the current profile image URL from the database
        const [userRows] = await connection.query<RowDataPacket[]>('SELECT profile_image_url FROM users WHERE id = ?', [userId]);
        const currentProfileImageUrl = userRows[0]?.profile_image_url || null;
        console.log('Current profile image URL:', currentProfileImageUrl);

        // Prepare the fields to update
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

        if (profileImage) {
            try {
                console.log('Uploading new profile image to Cloudinary.');
                // Upload the new profile image to Cloudinary
                const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
                    cloudinary.v2.uploader.upload_stream({ folder: 'mapPoint/profile_pictures' }, (error, result) => {
                        if (error) {
                            console.error('Cloudinary upload error:', error);
                            reject(error);
                        } else {
                            console.log('Cloudinary upload successful:', result!.secure_url);
                            resolve(result as { secure_url: string });
                        }
                    }).end(profileImage.buffer);
                });

                fields.push('profile_image_url = ?');
                values.push(result.secure_url);

                // Extract the public ID from the current profile image URL if it exists and is not a default image
                if (currentProfileImageUrl &&
                    !currentProfileImageUrl.includes('htpon9qyg2oktamknqzz') &&
                    !currentProfileImageUrl.includes('upb08ercpavzhyi1vzhs')) {
                    const publicId = currentProfileImageUrl.split('/').pop().split('.')[0];
                    console.log('Deleting old image from Cloudinary. Public ID:', publicId);

                    // Delete the previous image from Cloudinary
                    cloudinary.v2.uploader.destroy(`mapPoint/profile_pictures/${publicId}`, (error, result) => {
                        if (error) console.error('Error deleting old image:', error);
                    });
                }
            } catch (error) {
                console.error('Cloudinary error:', error);
                connection.release();
                return res.status(500).json({ status: 'error', message: 'Image upload failed' });
            }
        } else {
            // Set default profile image URL based on gender
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

        // Ensure there's something to update
        if (fields.length === 0) {
            console.log('No fields to update. Aborting.');
            connection.release();
            return res.status(400).json({ status: 'error', message: 'No fields to update' });
        }

        // Update query
        const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
        values.push(userId); // Append userId for the WHERE clause

        console.log('Executing update query:', query, values);
        await connection.query(query, values);

        // Retrieve updated user information
        const [updatedUserRows] = await connection.query<RowDataPacket[]>(
            'SELECT id, username, email, gender, profile_image_url, joined_at, last_login FROM users WHERE id = ?',
            [userId]
        );
        const updatedUser = updatedUserRows[0];

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

        connection.release();

        console.log('User update successful.');
        res.status(200).json({
            status: 'success',
            message: 'User updated successfully',
            user: {
                ...updatedUser,
                followers: followerCount,
                followings: followingCount,
            }
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
