import { Router } from 'express';
import { authenticateTokenAdmin } from '../middleweares/authMiddleweares';
import { getAllMarkersAdmin, updateMarkerBlockedStatus, updateMarkerAdmin, getMarkersByIdAdmin } from '../controllers/adminController';
import { validateUpdateMarkerAdmin } from '../middleweares/markerMiddlewares';
import { getActiveUsersAdmin, getActiveUsersByMonthAndYear, getBlockedMarkersAdmin, getNewUsersAdmin, getNewUsersThisMonthAdmin, getNewUsersThisWeekAdmin, getTotalMarkersAdmin, getTotalUsersAdmin } from '../controllers/statsController';

const adminRouter = Router();

// Routes pour les annonces
adminRouter.get('/markers', authenticateTokenAdmin, getAllMarkersAdmin);
adminRouter.patch('/markers/blocked', authenticateTokenAdmin, updateMarkerBlockedStatus);
adminRouter.put('/update/:id', authenticateTokenAdmin, validateUpdateMarkerAdmin, updateMarkerAdmin);
adminRouter.get('/markers/:id', authenticateTokenAdmin, getMarkersByIdAdmin);

// Route pour obtenir le nombre total d'utilisateurs
adminRouter.get('/stats/total-users', authenticateTokenAdmin, getTotalUsersAdmin);

// Route pour obtenir le nombre de nouveaux utilisateurs cette semaine
// adminRouter.get('/stats/new-users-week', authenticateTokenAdmin, getNewUsersThisWeekAdmin);

// // Route pour obtenir le nombre de nouveaux utilisateurs ce mois-ci
// adminRouter.get('/stats/new-users-month', authenticateTokenAdmin, getNewUsersThisMonthAdmin);

adminRouter.get('/stats/new-users', authenticateTokenAdmin, getNewUsersAdmin);
// Route pour obtenir le nombre total de marqueurs créés
adminRouter.get('/stats/total-markers', authenticateTokenAdmin, getTotalMarkersAdmin);

// Route pour obtenir le nombre de marqueurs bloqués
adminRouter.get('/stats/blocked-markers', authenticateTokenAdmin, getBlockedMarkersAdmin);

// Route pour obtenir le nombre d'utilisateurs actifs (ceux qui se sont connectés dans le dernier mois)
adminRouter.get('/stats/active-users', authenticateTokenAdmin, getActiveUsersAdmin);
adminRouter.get('/stats/active-users-all', authenticateTokenAdmin, getActiveUsersByMonthAndYear);

export default adminRouter;