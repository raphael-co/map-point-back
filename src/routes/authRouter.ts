import { Router } from 'express';
import { authenticateToken, validateLogin, validateRegister } from '../middleweares/authMiddleweares';
import { getUserController, loginController, registerController } from '../controllers/authController';



const authRouter = Router();

authRouter.post('/register', validateRegister, registerController);
authRouter.post('/login', validateLogin, loginController);
authRouter.get('/user', authenticateToken, getUserController);


export default authRouter;
