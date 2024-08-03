import { Router } from 'express';
import { validateLogin, validateRegister, validateRestPassword } from '../middleweares/authMiddleweares';
import { bulkRegisterController, googleAuthController, loginController, registerController, requestPasswordReset, resetPassword } from '../controllers/authController';



const authRouter = Router();

authRouter.post('/register', validateRegister, registerController);
authRouter.post('/google', googleAuthController);
authRouter.post('/login', validateLogin, loginController);
authRouter.post('/bulk-register', bulkRegisterController);
authRouter.post('/request-password-reset', requestPasswordReset);
authRouter.post('/reset-password',validateRestPassword, resetPassword);

export default authRouter;
