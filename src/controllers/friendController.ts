import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../utils/config/dbConnection';
import { getUsernameById } from '../utils/userUtils';
import { notifyUser } from './notificationsCoontroller';

export const sendFriendRequest = async (req: Request, res: Response) => {
    const { friendId } = req.body;
    const userId = req.user!.id;

    try {
        const connection = await pool.getConnection();

        // Vérifier si une demande de suivi existe déjà ou si l'utilisateur est déjà suivi
        const [rows] = await connection.query<RowDataPacket[]>(
            'SELECT * FROM followings WHERE user_id = ? AND following_id = ?', 
            [userId, friendId]
        );

        if (rows.length > 0) {
            if (rows[0].status === 'pending') {
                connection.release();
                return res.status(400).json({ status: 'error', message: 'Friend request already sent' });
            } else if (rows[0].status === 'accepted') {
                connection.release();
                return res.status(400).json({ status: 'error', message: 'Already following this user' });
            }
        }

        // Envoyer une nouvelle demande de suivi
        await connection.query('INSERT INTO followings (user_id, following_id, status) VALUES (?, ?, "pending") ON DUPLICATE KEY UPDATE status="pending"', [userId, friendId]);
        connection.release();

         // Créer une notification pour l'utilisateur
         const username = await getUsernameById(userId);
         const notificationContent = `${username} vous a envoyé une demande d'ami.`;
 
         // Envoyer une notification en utilisant notifyFollowers
         await notifyUser(userId,friendId, 'friend_request', notificationContent);

        res.status(201).json({ status: 'success', message: 'Friend request sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

export const acceptFriendRequest = async (req: Request, res: Response) => {
    const { friendId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        const connection = await pool.getConnection();

        // Vérifier si une demande de suivi en attente existe
        const [checkRequestRows] = await connection.query<RowDataPacket[]>(
            'SELECT * FROM followings WHERE user_id = ? AND following_id = ? AND status = "pending"', 
            [friendId, userId]
        );

        if (checkRequestRows.length === 0) {
            connection.release();
            return res.status(400).json({ status: 'error', message: 'No pending friend request from this user' });
        }

        // Accepter la demande de suivi
        await connection.query('UPDATE followings SET status = "accepted" WHERE user_id = ? AND following_id = ?', [friendId, userId]);
        await connection.query('UPDATE followers SET status = "accepted" WHERE user_id = ? AND follower_id = ?', [userId, friendId]);
        connection.release();

        const username = await getUsernameById(friendId);

        if (!username) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        res.status(200).json({ status: 'success', message: `${username} can now see your points` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

export const rejectFriendRequest = async (req: Request, res: Response) => {
    const { friendId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        const connection = await pool.getConnection();

        // Supprimer la relation de suivi quel que soit le statut
        await connection.query('DELETE FROM followings WHERE user_id = ? AND following_id = ?', [userId, friendId]);
        await connection.query('DELETE FROM followers WHERE user_id = ? AND follower_id = ?', [friendId, userId]);
        connection.release();
        res.status(200).json({ status: 'success', message: 'Unfollowed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};


export const listFollowing = async (req: Request, res: Response) => {
    const { userId } = req.params;

    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query<RowDataPacket[]>(
            `SELECT u.id, u.username, u.email, u.gender, u.joined_at, u.last_login, f.status, f.followed_at 
             FROM followings f 
             JOIN users u ON f.following_id = u.id 
             WHERE f.user_id = ?`, 
            [userId]
        );
        connection.release();

        const following = rows.map(row => ({
            id: row.id,
            username: row.username,
            gender: row.gender,
            last_login: row.last_login,
            followed_at: row.followed_at,
            status: row.status
        }));

        res.status(200).json({ status: 'success', following });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

export const listFollowers = async (req: Request, res: Response) => {
    const { userId } = req.params;

    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query<RowDataPacket[]>(
            `SELECT u.id, u.username, u.email, u.gender, u.joined_at, u.last_login, f.status, f.followed_at 
             FROM followers f 
             JOIN users u ON f.follower_id = u.id 
             WHERE f.user_id = ?`, 
            [userId]
        );
        connection.release();

        const followers = rows.map(row => ({
            id: row.id,
            username: row.username,
            gender: row.gender,
            last_login: row.last_login,
            followed_at: row.followed_at,
            status: row.status
        }));

        res.status(200).json({ status: 'success', followers });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

export const listFriendRequests = async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query<RowDataPacket[]>(
            `SELECT u.id, u.username, u.email, u.gender, u.joined_at, u.last_login, f.status, f.followed_at 
             FROM followings f 
             JOIN users u ON f.user_id = u.id 
             WHERE f.following_id = ? AND f.status = "pending"`, 
            [userId]
        );
        connection.release();

        const friendRequests = rows.map(row => ({
            id: row.id,
            username: row.username,
            email: row.email,
            gender: row.gender,
            joined_at: row.joined_at,
            last_login: row.last_login,
            requested_at: row.followed_at
        }));

        res.status(200).json({ status: 'success', friendRequests });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
