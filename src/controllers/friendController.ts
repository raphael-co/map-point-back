import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../utils/config/dbConnection';
import { getUsernameById } from '../utils/userUtils';

export const sendFriendRequest = async (req: Request, res: Response) => {
    const { friendId } = req.body;
    const userId = req.user?.id;

    console.log(req.user);

    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query<RowDataPacket[]>(
            'SELECT * FROM followings WHERE user_id = ? AND following_id = ?', 
            [userId, friendId]
        );
        if (rows.length > 0) {
            connection.release();
            return res.status(400).json({ status: 'error', message: 'Friend request already sent' });
        }

        await connection.query('INSERT INTO followings (user_id, following_id) VALUES (?, ?)', [userId, friendId]);
        await connection.query('INSERT INTO followers (user_id, follower_id) VALUES (?, ?)', [friendId, userId]);
        connection.release();
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

        // Check if there is a pending friend request from the friendId to the userId
        const [checkRequestRows] = await connection.query<RowDataPacket[]>(
            'SELECT * FROM followings WHERE user_id = ? AND following_id = ?', 
            [friendId, userId]
        );
        if (checkRequestRows.length === 0) {
            connection.release();
            return res.status(400).json({ status: 'error', message: 'No pending friend request from this user' });
        }

        // Update the friend request status to accepted
        await connection.query('UPDATE followings SET followed_at = CURRENT_TIMESTAMP WHERE user_id = ? AND following_id = ?', [friendId, userId]);
        await connection.query('UPDATE followers SET followed_at = CURRENT_TIMESTAMP WHERE user_id = ? AND follower_id = ?', [userId, friendId]);
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
        // Delete the friend request
        await connection.query('DELETE FROM followings WHERE user_id = ? AND following_id = ?', [friendId, userId]);
        await connection.query('DELETE FROM followers WHERE user_id = ? AND follower_id = ?', [userId, friendId]);
        connection.release();
        res.status(200).json({ status: 'success', message: 'Friend request rejected and deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

// Utility function to format the date to "friend since"
const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
};

export const listFollowing = async (req: Request, res: Response) => {
    const { userId } = req.params;

    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query<RowDataPacket[]>(
            `SELECT u.id, u.username, u.email, u.gender, u.joined_at, u.last_login, f.followed_at 
             FROM followings f 
             JOIN users u ON f.following_id = u.id 
             WHERE f.user_id = ?`, 
            [userId]
        );
        connection.release();

        const following = rows.map(row => ({
            id: row.id,
            username: row.username,
            // email: row.email,
            gender: row.gender,
            // joined_at: row.joined_at,
            last_login: row.last_login,
            followed_at: row.followed_at,
            // friend_since: formatDate(row.followed_at)  // Adding friend since information
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
            `SELECT u.id, u.username, u.email, u.gender, u.joined_at, u.last_login, f.followed_at 
             FROM followers f 
             JOIN users u ON f.follower_id = u.id 
             WHERE f.user_id = ?`, 
            [userId]
        );
        connection.release();

        const followers = rows.map(row => ({
            id: row.id,
            username: row.username,
            // email: row.email,
            gender: row.gender,
            // joined_at: row.joined_at,
            last_login: row.last_login,
            followed_at: row.followed_at,
            // friend_since: formatDate(row.followed_at)  // Adding friend since information
        }));

        res.status(200).json({ status: 'success', followers });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

// Fonction pour lister les demandes d'amis en attente
export const listFriendRequests = async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query<RowDataPacket[]>(
            `SELECT u.id, u.username, u.email, u.gender, u.joined_at, u.last_login, f.followed_at 
             FROM followings f 
             JOIN users u ON f.user_id = u.id 
             WHERE f.following_id = ? AND f.followed_at IS NULL`, 
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
            requested_at: row.followed_at  // Ajout de la date de la demande d'ami
        }));

        res.status(200).json({ status: 'success', friendRequests });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};