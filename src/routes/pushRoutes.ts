import express from 'express';
import { saveToken, sendNotification, removePushToken, sendNotificationToUsers, addPushToken } from '../controllers/pushController';
import { authenticateToken } from '../middleweares/authMiddleweares';


const pushRouter = express.Router();

pushRouter.post('/add-token', addPushToken);
pushRouter.post('/save-token', authenticateToken, saveToken);
pushRouter.post('/send-notification', authenticateToken, sendNotification);
pushRouter.post('/remove-push-token', authenticateToken, removePushToken);
pushRouter.post('/send-notification-to-users', sendNotificationToUsers);

export default pushRouter;
