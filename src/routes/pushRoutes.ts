import express from 'express';
import { saveToken, sendNotification, sendNotificationToUsers, addPushToken, linkUserWithPushToken, unlinkUserWithPushToken } from '../controllers/pushController';
import { authenticateToken } from '../middleweares/authMiddleweares';


const pushRouter = express.Router();

pushRouter.post('/add-token', addPushToken);
pushRouter.post('/save-token', authenticateToken, saveToken);
pushRouter.post('/send-notification', authenticateToken, sendNotification);
pushRouter.post('/remove-push-link-user', authenticateToken, unlinkUserWithPushToken);
pushRouter.post('/link-push-user', authenticateToken, linkUserWithPushToken);
pushRouter.post('/send-notification-to-users', sendNotificationToUsers);

export default pushRouter;
