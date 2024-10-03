import { Router } from "express";
import { authenticateTokenAdmin } from "../middleweares/authMiddleweares";
import { getAllMarkersAdmin, getMarkersByIdAdmin, updateMarkerAdmin, updateMarkerBlockedStatus } from "../controllers/adminController";
import { validateUpdateMarkerAdmin } from "../middleweares/markerMiddlewares";
import { getActiveUsersAdmin, getActiveUsersByMonthAndYear, getNewUsersAdmin, getTotalUsersAdmin } from "../controllers/statsController";
import { InserUserActif } from "../middleweares/usersActif/usersActif";
import { getBlockedMarkersAdmin, getCommentsByMonthAndYear, getCommentsByPeriod, getMarkersByMonthAndYear, getMarkersByPeriod, getTotalMarkersAdmin } from "../controllers/statMarkersController";
import { deleteUserAdmin, getAllUsersAdmin, getUserByIdAdmin, updateUserBlockedStatusAdmin, updateUserRoleAdmin } from "../controllers/adminUsersController";
import { deleteMarkerAdmin, deleteMultipleMarkersAdmin, getAllMarkersPaginationAdmin } from "../controllers/adminMarkersController";
import { getAnnouncementsWithPagination } from "../controllers/announcementController";

const adminRouter = Router();

// Routes pour les marqueurs
adminRouter.get('/markers', authenticateTokenAdmin, getAllMarkersAdmin);
adminRouter.get('/tabs/markers', authenticateTokenAdmin, getAllMarkersPaginationAdmin);
adminRouter.patch('/markers/blocked', authenticateTokenAdmin, updateMarkerBlockedStatus);
adminRouter.put('/update/:id', authenticateTokenAdmin, validateUpdateMarkerAdmin, updateMarkerAdmin);
adminRouter.get('/markers/:id', authenticateTokenAdmin, getMarkersByIdAdmin);
adminRouter.delete('/markers/:id', authenticateTokenAdmin, deleteMarkerAdmin);
adminRouter.post('/markers/delete-multiple', authenticateTokenAdmin, deleteMultipleMarkersAdmin);

// Routes pour les utilisateurs
adminRouter.get('/users', authenticateTokenAdmin, getAllUsersAdmin);
adminRouter.get('/users/:id', authenticateTokenAdmin, getUserByIdAdmin);
adminRouter.patch('/users/:id/role', authenticateTokenAdmin, updateUserRoleAdmin);
adminRouter.patch('/users/:id/blocked', authenticateTokenAdmin, updateUserBlockedStatusAdmin);
adminRouter.delete('/users/:id', authenticateTokenAdmin, deleteUserAdmin);

adminRouter.get('/announcements', authenticateTokenAdmin, getAnnouncementsWithPagination);


// Routes pour les statistiques des utilisateurs
adminRouter.get('/stats/total-users', authenticateTokenAdmin, getTotalUsersAdmin);
adminRouter.get('/stats/new-users', authenticateTokenAdmin, InserUserActif, getNewUsersAdmin);
adminRouter.get('/stats/active-users', authenticateTokenAdmin, getActiveUsersAdmin);
adminRouter.get('/stats/active-users-all', authenticateTokenAdmin, getActiveUsersByMonthAndYear);

// Routes pour les statistiques des marqueurs
adminRouter.get('/stats/total-markers', authenticateTokenAdmin, getTotalMarkersAdmin);

adminRouter.get('/stats/blocked-markers', authenticateTokenAdmin, getBlockedMarkersAdmin);

// Nouvelles routes pour les statistiques des marqueurs par mois, année, jour ou période
adminRouter.get('/stats/markers-by-month-year', authenticateTokenAdmin, getMarkersByMonthAndYear);
adminRouter.get('/stats/markers-by-period', authenticateTokenAdmin, getMarkersByPeriod);

// Nouvelles routes pour les statistiques des commentaires par mois, année, jour ou période
adminRouter.get('/stats/comments-by-month-year', authenticateTokenAdmin, getCommentsByMonthAndYear);
adminRouter.get('/stats/comments-by-period', authenticateTokenAdmin, getCommentsByPeriod);

export default adminRouter;