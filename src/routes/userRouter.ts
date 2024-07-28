import { Router } from 'express';
import { authenticateToken } from '../middleweares/authMiddleweares';
import { getAllUsers, getAllUsersExceptCurrent, getUserAuth, getUserById, updateUser } from '../controllers/userController';
import { validateEditeUser } from '../middleweares/userMiddleweares';

const userRouter = Router();

userRouter.get('/', authenticateToken, getUserAuth);
userRouter.put('/edit', authenticateToken,validateEditeUser, updateUser);
userRouter.get('/all', authenticateToken, getAllUsers);
userRouter.get('/all-except-current', authenticateToken, getAllUsersExceptCurrent);
userRouter.get('/:id', authenticateToken, getUserById); 

export default userRouter;
