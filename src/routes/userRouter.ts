import { Router } from 'express';
import { authenticateToken } from '../middleweares/authMiddleweares';
import { getAllUsers, getAllUsersExceptCurrent, getUserAuth } from '../controllers/userController';




const userRouter = Router();

userRouter.get('/', authenticateToken, getUserAuth);
userRouter.get('/all', authenticateToken, getAllUsers);
userRouter.get('/all-except-current', authenticateToken, getAllUsersExceptCurrent);

export default userRouter;
