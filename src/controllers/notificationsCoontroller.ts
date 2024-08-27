import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../utils/config/dbConnection';
import { PoolConnection } from 'mysql2/promise';
import { io } from './setSocketServer'; // Assurez-vous que l'import est correct
import { User } from '../utils/userUtils';

export const getUserNotifications = async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        const connection = await pool.getConnection();
        const [notifications] = await connection.query<RowDataPacket[]>(
            `SELECT n.id, n.sender_user_id, u.username as sender_username, u.profile_image_url, n.type, n.content, n.is_read, n.created_at, 
            CASE 
                WHEN f.status = 'accepted' THEN 'true'
                WHEN f.status = 'pending' THEN 'null'
                WHEN f.status IS NULL THEN 'canceled'
                ELSE 'false'
            END as follow_status
            FROM notifications n
            JOIN users u ON n.sender_user_id = u.id
            LEFT JOIN followings f ON n.sender_user_id = f.user_id AND n.receiver_user_id = f.following_id
            WHERE n.receiver_user_id = ?
            ORDER BY n.created_at DESC`,
            [userId]
        );
        connection.release();

        if (notifications.length === 0) {
            return res.status(404).json({ status: 'error', message: 'No notifications found' });
        }

        res.status(200).json({ status: 'success', notifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
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

        // Envoyer une notification en temps réel via Socket.IO
        if (io) {
            io.to(`user_${receiverUserId}`).emit('getNotification', {
                senderUserId: senderUserId,
                type: type,
                content: content,
                timestamp: new Date()
            });
        }

        res.status(201).json({ status: 'success', message: 'Notification created successfully' });
    } catch (error) {
        console.error('Error creating notification:', error);
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
        console.error('Error marking notification as read:', error);
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
        console.error('Error deleting notification:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

// Notifier tous les followers
export const notifyFollowers = async (userId: number, type: string, content: string, accepted: string): Promise<void> => {
    const connection: PoolConnection = await pool.getConnection();

    try {
        const [followers] = await connection.query<RowDataPacket[]>(
            'SELECT follower_id FROM followers WHERE user_id = ? AND status = ?',
            [userId, accepted]
        );

        const notificationPromises = followers.map(async (follower) => {
            const followerId = follower.follower_id;

            await connection.query(
                'INSERT INTO notifications (receiver_user_id, sender_user_id, type, content) VALUES (?, ?, ?, ?)',
                [followerId, userId, type, content]
            );

            if (io) {
                io.to(`user_${followerId}`).emit('getNotification', {
                    senderUserId: userId,
                    type: type,
                    content: content,
                    timestamp: new Date()
                });
            }
        });

        await Promise.all(notificationPromises);

        console.log('Notifications sent successfully');

    } catch (error) {
        console.error('Error notifying followers:', error);
        throw error;
    } finally {
        connection.release();
    }
};


export const notifyUser = async (userId: number, idReceiver: number, type: string, user : User | null, content: string): Promise<void> => {
    const connection: PoolConnection = await pool.getConnection();

    try {
        // Vérifier si une notification similaire existe déjà
        const [existingNotification] = await connection.query<RowDataPacket[]>(
            'SELECT * FROM notifications WHERE receiver_user_id = ? AND sender_user_id = ? AND type = ?',
            [idReceiver, userId, type]
        );

        if (existingNotification.length > 0) {
            // Si une notification existe mais que son statut ou son contenu a changé, nous mettons à jour
            const existingContent = existingNotification[0].content;
            if (existingContent === content) {
                console.log('Notification already exists with the same content for receiver:', idReceiver);
                return; // La notification existe déjà avec le même contenu, donc on ne fait rien
            }

            // Mettre à jour le contenu de la notification existante
            await connection.query(
                'UPDATE notifications SET content = ? WHERE id = ?',
                [content, existingNotification[0].id]
            );

            console.log('Notification updated for receiver:', idReceiver, existingNotification[0].id);
        } else {
            // Insérer la nouvelle notification si elle n'existe pas déjà
            const [result] = await connection.query(
                'INSERT INTO notifications (receiver_user_id, sender_user_id, type, content) VALUES (?, ?, ?, ?)',
                [idReceiver, userId, type, content]
            );

            console.log('Notification inserted for receiver:', idReceiver, result);
        }

        // Envoyer la notification via Socket.IO
        if (io) {
            io.to(`user_${idReceiver}`).emit('getNotification', {
                sender_user_id: userId,
                type: type,
                sender_username: user?.username ?? 'Anonymous', // Default to 'Anonymous' if null
                profile_image_url: user?.profile_image_url ?? null,
                content: content,
                created_at: new Date()
            });

            console.log('Notification sent to user:', idReceiver);
        } else {
            console.error('Socket.IO instance is not initialized.');
        }

    } catch (error) {
        console.error('Error notifying user:', error);
        throw error;
    } finally {
        connection.release();
    }
};

