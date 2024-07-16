import { Router } from 'express';
import { sendFriendRequest, acceptFriendRequest, rejectFriendRequest, listFollowers, listFollowing, listFriendRequests } from '../controllers/friendController';
import { authenticateToken } from '../middleweares/authMiddleweares';



const friendRouter = Router();

friendRouter.post('/send-request', authenticateToken, sendFriendRequest);
friendRouter.post('/accept-request', authenticateToken, acceptFriendRequest);
friendRouter.delete('/reject-request', authenticateToken, rejectFriendRequest);
friendRouter.get('/listFollowers/:userId', authenticateToken, listFollowers);
friendRouter.get('/listFollowing/:userId', authenticateToken, listFollowing);
friendRouter.get('/friend-requests', authenticateToken, listFriendRequests); 

export default friendRouter;
