import express from 'express';
import { authenticateToken } from '../middleweares/authMiddleweares';
import {
    getUserNotifications,
    createNotification,
    markNotificationAsRead,
    deleteNotification,
    markAllNotificationsAsRead,
} from '../controllers/notificationsController';

const notificationRouter = express.Router();

// Récupérer toutes les notifications pour un utilisateur
notificationRouter.get('/', authenticateToken, getUserNotifications);

// Créer une nouvelle notification
notificationRouter.post('/', authenticateToken, createNotification);

// Marquer une notification comme lue
notificationRouter.patch('/:notificationId/read', authenticateToken, markNotificationAsRead);

notificationRouter.patch('/read', authenticateToken, markAllNotificationsAsRead);

// Supprimer une notification
notificationRouter.delete('/:notificationId', authenticateToken, deleteNotification);


export default notificationRouter;
