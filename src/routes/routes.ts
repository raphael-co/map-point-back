import { Router } from 'express';
import authRouter from './authRouter';
import friendRouter from './friendRoutes';
import pushRouter from './pushRoutes';
import userRouter from './userRouter';

const routes = Router();

routes.use('/auth', authRouter);
routes.use('/friends', friendRouter);
routes.use('/push', pushRouter);
routes.use('/user', userRouter);
routes.get('/test', (req, res) => {
    res.status(200).json({ message: 'is runnig' });
});

export default routes;