import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../utils/config/dbConnection';
import { PoolConnection } from 'mysql2/promise';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer;

export const setSocketServer = (ioInstance: SocketIOServer) => {
    io = ioInstance;
};
// Récupérer toutes les notifications pour un utilisateur
export const getUserNotifications = async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        const connection = await pool.getConnection();
        const [notifications] = await connection.query<RowDataPacket[]>(
            'SELECT n.id, n.sender_user_id, u.username as sender_username, n.type, n.content, n.is_read, n.created_at ' +
            'FROM notifications n ' +
            'JOIN users u ON n.sender_user_id = u.id ' +
            'WHERE n.receiver_user_id = ? ' +
            'ORDER BY n.created_at DESC',
            [userId]
        );
        connection.release();

        if (notifications.length === 0) {
            return res.status(404).json({ status: 'error', message: 'No notifications found' });
        }

        res.status(200).json({ status: 'success', notifications });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

// Créer une nouvelle notification
export const createNotification = async (req: Request, res: Response) => {
    const { receiverUserId, type, content } = req.body;
    const senderUserId = req.user?.id;

    if (!senderUserId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    if (!receiverUserId || !type) {
        return res.status(400).json({ status: 'error', message: 'Receiver user ID and notification type are required' });
    }

    try {
        const connection = await pool.getConnection();
        await connection.query(
            'INSERT INTO notifications (receiver_user_id, sender_user_id, type, content) VALUES (?, ?, ?, ?)',
            [receiverUserId, senderUserId, type, content || '']
        );
        connection.release();

        res.status(201).json({ status: 'success', message: 'Notification created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

// Mettre à jour le statut de lecture d'une notification
export const markNotificationAsRead = async (req: Request, res: Response) => {
    const { notificationId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND receiver_user_id = ?',
            [notificationId, userId]
        );
        connection.release();

        if ((result as any).affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Notification not found or not authorized' });
        }

        res.status(200).json({ status: 'success', message: 'Notification marked as read' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

// Supprimer une notification
export const deleteNotification = async (req: Request, res: Response) => {
    const { notificationId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'DELETE FROM notifications WHERE id = ? AND receiver_user_id = ?',
            [notificationId, userId]
        );
        connection.release();

        if ((result as any).affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Notification not found or not authorized' });
        }

        res.status(200).json({ status: 'success', message: 'Notification deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};


export const notifyFollowers = async (userId: number, type: string, content: string, accepted: string): Promise<void> => {
    const connection: PoolConnection = await pool.getConnection();

    try {
        // Récupérer tous les followers de l'utilisateur
        const [followers] = await connection.query<RowDataPacket[]>(
            'SELECT follower_id FROM followers WHERE user_id = ? AND status = ?',
            [userId, accepted]
        );

        // Créer une notification pour chaque follower et envoyer un message via socket.io
        const notificationPromises = followers.map(async (follower) => {
            const followerId = follower.follower_id;

            // Insérer la notification dans la base de données
            await connection.query(
                'INSERT INTO notifications (receiver_user_id, sender_user_id, type, content) VALUES (?, ?, ?, ?)',
                [followerId, userId, type, content]
            );

            // Envoyer une notification en temps réel via Socket.IO
            io.to(`user_${followerId}`).emit('getNotification', {
                senderUserId: userId,
                type: type,
                content: content,
                timestamp: new Date()
            });
        });

        // Exécuter toutes les insertions de notifications et les émissions de sockets en parallèle
        await Promise.all(notificationPromises);
    } catch (error) {
        console.error('Error notifying followers:', error);
        throw error; // Laisser l'appelant gérer les erreurs
    } finally {
        connection.release();
    }
};
