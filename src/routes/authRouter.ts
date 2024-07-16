import { Router } from 'express';
import { validateLogin, validateRegister } from '../middleweares/authMiddleweares';
import { loginController, registerController } from '../controllers/authController';



const authRouter = Router();

authRouter.post('/register', validateRegister, registerController);
authRouter.post('/login', validateLogin, loginController);


export default authRouter;
