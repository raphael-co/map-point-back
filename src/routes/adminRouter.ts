import { Router } from 'express';
import { authenticateTokenAdmin } from '../middleweares/authMiddleweares';
import { getAllMarkersAdmin, updateMarkerBlockedStatus } from '../controllers/adminController';

const adminRouter = Router();

// Routes pour les annonces
adminRouter.get('/markers', authenticateTokenAdmin, getAllMarkersAdmin);
adminRouter.patch('/markers/blocked', authenticateTokenAdmin, updateMarkerBlockedStatus);

export default adminRouter;