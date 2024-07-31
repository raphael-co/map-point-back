import { Router } from 'express';

import { authenticateToken } from '../middleweares/authMiddleweares';
import { validateCreateMarker } from '../middleweares/markerMiddlewares';
import { createMarker } from '../controllers/markerController';

const markerRouter = Router();

markerRouter.post('/create', authenticateToken, validateCreateMarker, createMarker);

export default markerRouter;
