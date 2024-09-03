import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../utils/config/dbConnection';
import { getUserById } from '../utils/userUtils';
import { notifyUser } from './notificationsController';
import { io } from './setSocketServer';
import getTranslation from '../utils/translate';  // Importer la fonction de traduction

export const sendFriendRequest = async (req: Request, res: Response) => {
    const { friendId } = req.body;
    const userId = req.user!.id;
    const language = 'fr'; // Déterminer la langue à partir de l'en-tête de requête

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
                return res.status(400).json({ status: 'error', message: getTranslation('FRIEND_REQUEST_ALREADY_SENT', language, 'controllers', 'friendController') });
            } else if (rows[0].status === 'accepted') {
                connection.release();
                return res.status(400).json({ status: 'error', message: getTranslation('ALREADY_FOLLOWING', language, 'controllers', 'friendController') });
            }
        }

        // Envoyer une nouvelle demande de suivi
        await connection.query('INSERT INTO followings (user_id, following_id, status) VALUES (?, ?, "pending") ON DUPLICATE KEY UPDATE status="pending"', [userId, friendId]);

        // Insérer dans la table followers aussi pour garder la relation cohérente
        await connection.query('INSERT INTO followers (user_id, follower_id, status) VALUES (?, ?, "pending") ON DUPLICATE KEY UPDATE status="pending"', [friendId, userId]);

        // Créer une notification pour l'utilisateur
        const user = await getUserById(userId);
        if (!user) {
            return res.status(404).json({ status: 'error', message: getTranslation('USER_NOT_FOUND', language, 'controllers', 'friendController') });
        }
    
        const notificationContent = `${user.username} vous a envoyé une demande d'ami.`;

        // Envoyer une notification en utilisant notifyFollowers
        await notifyUser(userId, friendId, 'follow', user, notificationContent);

        // Émettre un événement Socket.IO pour mettre à jour la notification existante
        if (io) {
            io.to(`user_${friendId}`).emit('followRequestUpdated', {
                senderUserId: userId,
                type: 'follow',
                follow_status: 'null', // Indique que la demande est à nouveau en attente
            });
        }

        connection.release();

        res.status(201).json({ status: 'success', message: getTranslation('FRIEND_REQUEST_SENT_SUCCESS', language, 'controllers', 'friendController') });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'friendController') });
    }
};

export const acceptFriendRequest = async (req: Request, res: Response) => {
    const { friendId } = req.body;
    const userId = req.user?.id;
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue à partir de l'en-tête de requête

    if (!userId) {
        return res.status(401).json({ status: 'error', message: getTranslation('UNAUTHORIZED', language, 'controllers', 'friendController') });
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
            return res.status(400).json({ status: 'error', message: getTranslation('NO_PENDING_FRIEND_REQUEST', language, 'controllers', 'friendController') });
        }

        // Accepter la demande de suivi dans les deux tables
        await connection.query('UPDATE followings SET status = "accepted" WHERE user_id = ? AND following_id = ?', [friendId, userId]);

        // Vérifier si l'enregistrement existe dans followers, si ce n'est pas le cas, insérer
        await connection.query('INSERT INTO followers (user_id, follower_id, status) VALUES (?, ?, "accepted") ON DUPLICATE KEY UPDATE status="accepted"', [userId, friendId]);

        connection.release();

        const user = await getUserById(friendId);
        if (!user) {
            return res.status(404).json({ status: 'error', message: getTranslation('USER_NOT_FOUND', language, 'controllers', 'friendController') });
        }

        res.status(200).json({ status: 'success', message: getTranslation('FRIEND_REQUEST_ACCEPTED', language, 'controllers', 'friendController').replace('{username}', user.username) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'friendController') });
    }
};

export const rejectFriendRequest = async (req: Request, res: Response) => {
    const { friendId } = req.body;
    const userId = req.user?.id;
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue à partir de l'en-tête de requête

    if (!userId) {
        return res.status(401).json({ status: 'error', message: getTranslation('UNAUTHORIZED', language, 'controllers', 'friendController') });
    }

    try {
        const connection = await pool.getConnection();

        // Supprimer la relation de suivi quel que soit le statut
        await connection.query('DELETE FROM followings WHERE user_id = ? AND following_id = ?', [userId, friendId]);
        await connection.query('DELETE FROM followers WHERE user_id = ? AND follower_id = ?', [friendId, userId]);
        connection.release();

        // Émettre un événement Socket.IO pour mettre à jour la notification
        if (io) {
            io.to(`user_${friendId}`).emit('followRequestRejected', {
                senderUserId: userId,
                type: 'follow',
                follow_status: 'false'
            });
        }
        
        res.status(200).json({ status: 'success', message: getTranslation('FRIEND_REQUEST_REJECTED', language, 'controllers', 'friendController') });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'friendController') });
    }
};

export const listFollowing = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue à partir de l'en-tête de requête

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
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'friendController') });
    }
};

export const listFollowers = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue à partir de l'en-tête de requête

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
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'friendController') });
    }
};

export const listFriendRequests = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue à partir de l'en-tête de requête

    if (!userId) {
        return res.status(401).json({ status: 'error', message: getTranslation('UNAUTHORIZED', language, 'controllers', 'friendController') });
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
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'friendController') });
    }
};
