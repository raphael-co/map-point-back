import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../utils/config/dbConnection';
import { PoolConnection } from 'mysql2/promise';
import { io } from './setSocketServer'; // Assurez-vous que l'import est correct
import { User } from '../utils/userUtils';
import getTranslation from '../utils/translate';  // Importer la fonction de traduction

export const getUserNotifications = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const language = req.headers['accept-language'] || 'en'; // Determine the language from request headers

    if (!userId) {
        return res.status(401).json({
            status: 'error',
            message: getTranslation('UNAUTHORIZED', language, 'controllers', 'notificationsController'),
        });
    }

    try {
        const connection = await pool.getConnection();
        const [notifications] = await connection.query<RowDataPacket[]>(
            `SELECT n.id, n.sender_user_id, u.username as sender_username, u.profile_image_url, n.type, n.content, n.is_read, n.created_at, 
            n.event_id,  -- Include event_id in the SELECT statement
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
            return res.status(404).json({
                status: 'error',
                message: getTranslation('NO_NOTIFICATIONS_FOUND', language, 'controllers', 'notificationsController'),
            });
        }

        // Transform notifications based on type
        const formattedNotifications = notifications.map(notification => {
            const baseNotification = {
                senderUserId: notification.sender_user_id,
                type: notification.type,
                content: notification.content,
                timestamp: notification.created_at,
                sender_username: notification.sender_username ?? getTranslation('ANONYMOUS', language, 'controllers', 'notificationsController'),
                profile_image_url: notification.profile_image_url ?? null,
                created_at: notification.created_at,
            };

            if (notification.type === 'marker' && notification.event_id) {
                console.log("notification.event_id", notification.event_id);
                
                return {
                    ...baseNotification,
                    event_id: notification.event_id,
                };
            } else {
                return {
                    ...baseNotification,
                };
            }
        });

        res.status(200).json({ status: 'success', notifications: formattedNotifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            status: 'error',
            message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'notificationsController'),
        });
    }
};

// Créer une nouvelle notification
export const createNotification = async (req: Request, res: Response) => {
    const { receiverUserId, type, content } = req.body;
    const senderUserId = req.user?.id;
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue à partir de l'en-tête de requête

    if (!senderUserId) {
        return res.status(401).json({ status: 'error', message: getTranslation('UNAUTHORIZED', language, 'controllers', 'notificationsController') });
    }

    if (!receiverUserId || !type) {
        return res.status(400).json({ status: 'error', message: getTranslation('RECEIVER_ID_TYPE_REQUIRED', language, 'controllers', 'notificationsController') });
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

        res.status(201).json({ status: 'success', message: getTranslation('NOTIFICATION_CREATED_SUCCESS', language, 'controllers', 'notificationsController') });
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'notificationsController') });
    }
};

// Mettre à jour le statut de lecture d'une notification
export const markNotificationAsRead = async (req: Request, res: Response) => {
    const { notificationId } = req.params;
    const userId = req.user?.id;
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue à partir de l'en-tête de requête

    if (!userId) {
        return res.status(401).json({ status: 'error', message: getTranslation('UNAUTHORIZED', language, 'controllers', 'notificationsController') });
    }

    try {
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND receiver_user_id = ?',
            [notificationId, userId]
        );
        connection.release();

        if ((result as any).affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: getTranslation('NOTIFICATION_NOT_FOUND_OR_UNAUTHORIZED', language, 'controllers', 'notificationsController') });
        }

        res.status(200).json({ status: 'success', message: getTranslation('NOTIFICATION_MARKED_AS_READ', language, 'controllers', 'notificationsController') });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'notificationsController') });
    }
};

// Supprimer une notification
export const deleteNotification = async (req: Request, res: Response) => {
    const { notificationId } = req.params;
    const userId = req.user?.id;
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue à partir de l'en-tête de requête

    if (!userId) {
        return res.status(401).json({ status: 'error', message: getTranslation('UNAUTHORIZED', language, 'controllers', 'notificationsController') });
    }

    try {
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'DELETE FROM notifications WHERE id = ? AND receiver_user_id = ?',
            [notificationId, userId]
        );
        connection.release();

        if ((result as any).affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: getTranslation('NOTIFICATION_NOT_FOUND_OR_UNAUTHORIZED', language, 'controllers', 'notificationsController') });
        }

        res.status(200).json({ status: 'success', message: getTranslation('NOTIFICATION_DELETED_SUCCESS', language, 'controllers', 'notificationsController') });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'notificationsController') });
    }
};

// Notifier tous les followers
export const notifyFollowers = async (
    userId: number,
    type: string,
    content: string,
    accepted: string,
    user: User | null,
    markerId: number // Include markerId as a parameter
): Promise<void> => {
    const connection: PoolConnection = await pool.getConnection();
    const language = 'en'; 

    try {
        const [followers] = await connection.query<RowDataPacket[]>(
            'SELECT follower_id FROM followers WHERE user_id = ? AND status = ?',
            [userId, accepted]
        );

        const notificationPromises = followers.map(async (follower) => {
            const followerId = follower.follower_id;

            console.log(type);

            const [result] = await connection.query(
                'INSERT INTO notifications (receiver_user_id, sender_user_id, type, content, event_id) VALUES (?, ?, ?, ?, ?)',
                [followerId, userId, type, content, markerId]
            );
            console.log('Notification inserted for follower:', followerId);

            // Send the notification via Socket.IO
            if (io) {
                io.to(`user_${followerId}`).emit('getNotification', {
                    senderUserId: userId,
                    type: type,
                    content: content,
                    timestamp: new Date(),
                    sender_username: user?.username ?? getTranslation('ANONYMOUS', language, 'controllers', 'notificationsController'),
                    profile_image_url: user?.profile_image_url ?? null,
                    created_at: new Date(),
                    event_id: markerId
                });

                console.log('Notification sent to follower:', followerId);
            } else {
                console.error('Socket.IO instance is not initialized.');
            }
        });

        await Promise.all(notificationPromises);

        console.log('Notifications sent successfully to all followers.');
    } catch (error) {
        console.error('Error notifying followers:', error);
        throw error;
    } finally {
        connection.release();
    }
};

export const notifyUser = async (
    userId: number,
    idReceiver: number,
    type: string,
    user: User | null,
    content: string,
    eventId?: number // Make eventId optional
): Promise<void> => {
    const connection: PoolConnection = await pool.getConnection();
    const language = 'en'; // Default language, can be modified if necessary

    try {
        // Check if a similar notification already exists
        const [existingNotification] = await connection.query<RowDataPacket[]>(
            'SELECT * FROM notifications WHERE receiver_user_id = ? AND sender_user_id = ? AND type = ?',
            [idReceiver, userId, type]
        );

        if (existingNotification.length > 0) {
            // If a notification exists but its status or content has changed, update it
            const existingContent = existingNotification[0].content;
            if (existingContent === content) {
                console.log('Notification already exists with the same content for receiver:', idReceiver);
                return; // The notification already exists with the same content, so do nothing
            }

            // Update the content of the existing notification
            await connection.query(
                'UPDATE notifications SET content = ? WHERE id = ?',
                [content, existingNotification[0].id]
            );

            console.log('Notification updated for receiver:', idReceiver, existingNotification[0].id);
        } else {
            // Insert the new notification if it does not already exist
            const [result] = await connection.query(
                'INSERT INTO notifications (receiver_user_id, sender_user_id, type, content, event_id) VALUES (?, ?, ?, ?, ?)',
                [idReceiver, userId, type, content, eventId || null] // Use eventId if provided, otherwise NULL
            );

            console.log('Notification inserted for receiver:', idReceiver, result);
        }

        // Send the notification via Socket.IO
        if (io) {
            io.to(`user_${idReceiver}`).emit('getNotification', {
                sender_user_id: userId,
                type: type,
                sender_username: user?.username ?? getTranslation('ANONYMOUS', language, 'controllers', 'notificationsController'),
                profile_image_url: user?.profile_image_url ?? null,
                content: content,
                created_at: new Date(),
                event_id: eventId // Optionally include event_id if provided
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
