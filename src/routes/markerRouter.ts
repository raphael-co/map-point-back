import { Router } from 'express';

import { authenticateToken } from '../middleweares/authMiddleweares';
import { validateCreateMarker } from '../middleweares/markerMiddlewares';
import { createMarker, getAllMarkers } from '../controllers/markerController';

const markerRouter = Router();

markerRouter.post('/create', authenticateToken, validateCreateMarker, createMarker);
markerRouter.get('/', authenticateToken, getAllMarkers);
export default markerRouter;
