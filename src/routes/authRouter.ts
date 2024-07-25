import { Router } from 'express';
import { validateLogin, validateRegister } from '../middleweares/authMiddleweares';
import { bulkRegisterController, loginController, registerController } from '../controllers/authController';



const authRouter = Router();

authRouter.post('/register', validateRegister, registerController);
authRouter.post('/login', validateLogin, loginController);
authRouter.post('/bulk-register', bulkRegisterController);

export default authRouter;
