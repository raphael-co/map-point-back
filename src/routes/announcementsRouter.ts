import { Router } from 'express';

import { authenticateToken, authenticateTokenAdmin } from '../middleweares/authMiddleweares';
import { addAnnouncement, deleteAnnouncement, getAnnouncementById, getAnnouncements, updateAnnouncement } from '../controllers/announcementController';
import { validateAnnouncement } from '../middleweares/announcementsMiddleweares';
import { InserUserActif } from '../middleweares/usersActif/usersActif';



const announcementsRouter = Router();

// Routes pour les annonces
announcementsRouter.post('/add', authenticateTokenAdmin,InserUserActif,validateAnnouncement, addAnnouncement);
announcementsRouter.get('/', authenticateToken,InserUserActif, getAnnouncements);
announcementsRouter.get('/:id', authenticateToken, InserUserActif,getAnnouncementById);  // Nouvelle route pour obtenir une annonce par ID
announcementsRouter.put('/update/:id', authenticateTokenAdmin,InserUserActif, updateAnnouncement);
announcementsRouter.delete('/:id', authenticateTokenAdmin,InserUserActif, deleteAnnouncement);

export default announcementsRouter;