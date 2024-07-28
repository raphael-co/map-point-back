import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../utils/config/dbConnection';

export const getUserAuth = async (req: Request, res: Response) => {
    const userId = req.user?.id;

    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query<RowDataPacket[]>('SELECT id, username, email, gender FROM users WHERE id = ?', [userId]);
        connection.release();

        if (rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        const user = rows[0];
        res.status(200).json({ status: 'success', user });
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
