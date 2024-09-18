import { Router } from 'express';
import { authenticateTokenAdmin } from '../middleweares/authMiddleweares';
import { getAllMarkersAdmin, updateMarkerBlockedStatus, updateMarkerAdmin, getMarkersByIdAdmin } from '../controllers/adminController';
import { validateUpdateMarker } from '../middleweares/markerMiddlewares';

const adminRouter = Router();

// Routes pour les annonces
adminRouter.get('/markers', authenticateTokenAdmin, getAllMarkersAdmin);
adminRouter.patch('/markers/blocked', authenticateTokenAdmin, updateMarkerBlockedStatus);
adminRouter.put('/update/:id', authenticateTokenAdmin, validateUpdateMarker, updateMarkerAdmin);
adminRouter.get('/markers/:id', authenticateTokenAdmin, getMarkersByIdAdmin);

export default adminRouter;