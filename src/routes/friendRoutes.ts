import { Router } from 'express';
import { sendFriendRequest, acceptFriendRequest, rejectFriendRequest, listFollowers, listFollowing, listFriendRequests } from '../controllers/friendController';
import { authenticateToken } from '../middleweares/authMiddleweares';
import { InserUserActif } from '../middleweares/usersActif/usersActif';



const friendRouter = Router();

friendRouter.post('/send-request', authenticateToken, InserUserActif, sendFriendRequest);
friendRouter.post('/accept-request', authenticateToken, InserUserActif, acceptFriendRequest);
friendRouter.delete('/reject-request', authenticateToken, InserUserActif, rejectFriendRequest);
friendRouter.get('/listFollowers/:userId', authenticateToken, InserUserActif, listFollowers);
friendRouter.get('/listFollowing/:userId', authenticateToken, InserUserActif, listFollowing);
friendRouter.get('/friend-requests', authenticateToken, InserUserActif, listFriendRequests);

export default friendRouter;
