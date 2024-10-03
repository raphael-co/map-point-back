import { Router } from 'express';

import { authenticateToken, authenticateTokenAdmin } from '../middleweares/authMiddleweares';
import { addAnnouncement, deleteAnnouncement, deleteAnnouncements, getAnnouncementById, getAnnouncements, getAnnouncementsWithPagination, updateAnnouncement } from '../controllers/announcementController';
import { validateAnnouncement } from '../middleweares/announcementsMiddleweares';
import { InserUserActif } from '../middleweares/usersActif/usersActif';



const announcementsRouter = Router();

// Routes pour les annonces
announcementsRouter.post('/add', authenticateTokenAdmin,InserUserActif,validateAnnouncement, addAnnouncement);
announcementsRouter.get('/', authenticateToken,InserUserActif, getAnnouncements);
announcementsRouter.get('/:id', authenticateToken, InserUserActif,getAnnouncementById);
announcementsRouter.put('/update/:id', authenticateTokenAdmin,InserUserActif,validateAnnouncement,updateAnnouncement);
announcementsRouter.delete('/:id', authenticateTokenAdmin,InserUserActif, deleteAnnouncement);
announcementsRouter.post('/delete-multiple', authenticateTokenAdmin, InserUserActif, deleteAnnouncements);

export default announcementsRouter;