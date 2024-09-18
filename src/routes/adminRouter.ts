import { Router } from 'express';
import { authenticateTokenAdmin } from '../middleweares/authMiddleweares';
import { getAllMarkersAdmin } from '../controllers/adminController';

const adminRouter = Router();

// Routes pour les annonces
adminRouter.get('/markers', authenticateTokenAdmin, getAllMarkersAdmin);

export default adminRouter;