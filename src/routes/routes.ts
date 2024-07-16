import { Router } from 'express';
import authRouter from './authRouter';
import friendRouter from './friendRoutes';


const routes = Router();

routes.use('/auth', authRouter);
routes.use('/friends', friendRouter);

// routes.get('/test', (req, res) => {
//     res.status(200).json({ message: 'is runnig' });
// });

export default routes;