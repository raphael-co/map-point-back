import express from 'express';
import { authenticateToken } from '../middleweares/authMiddleweares';
import {
    getUserNotifications,
    createNotification,
    markNotificationAsRead,
    deleteNotification,
    markAllNotificationsAsRead,
} from '../controllers/notificationsController';
import { InserUserActif } from '../middleweares/usersActif/usersActif';

const notificationRouter = express.Router();

// Récupérer toutes les notifications pour un utilisateur
notificationRouter.get('/', authenticateToken, InserUserActif, getUserNotifications);

// Créer une nouvelle notification
notificationRouter.post('/', authenticateToken, InserUserActif, createNotification);

// Marquer une notification comme lue
notificationRouter.patch('/:notificationId/read', authenticateToken, InserUserActif, markNotificationAsRead);

notificationRouter.patch('/read', authenticateToken, InserUserActif, markAllNotificationsAsRead);

// Supprimer une notification
notificationRouter.delete('/:notificationId', authenticateToken, InserUserActif, deleteNotification);


export default notificationRouter;
