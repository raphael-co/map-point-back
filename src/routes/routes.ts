import { Router } from 'express';
import authRouter from './authRouter';
import friendRouter from './friendRoutes';
import pushRouter from './pushRoutes';
import userRouter from './userRouter';
import markerRouter from './markerRouter';
import commentRouter from './commentRouter';
import notificationRouter from './notificationsRouter';
import announcementsRouter from './announcementsRouter';

const routes = Router();

routes.use('/auth', authRouter);
routes.use('/friends', friendRouter);
routes.use('/push', pushRouter);
routes.use('/user', userRouter);
routes.use('/marker',markerRouter)
routes.use('/comments', commentRouter);
routes.use('/notifications', notificationRouter);
routes.use('/announcements', announcementsRouter);
routes.get('/test', (req, res) => {
    res.status(200).json({ message: 'is runnig' });
});

export default routes;