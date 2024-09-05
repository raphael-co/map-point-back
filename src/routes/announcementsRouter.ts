import { Router } from 'express';

import { authenticateTokenAdmin } from '../middleweares/authMiddleweares';
import { addAnnouncement, deleteAnnouncement, getAnnouncementById, getAnnouncements, updateAnnouncement } from '../controllers/announcementController';
import { validateAnnouncement } from '../middleweares/announcementsMiddleweares';



const announcementsRouter = Router();

// Routes pour les annonces
announcementsRouter.post('/add', authenticateTokenAdmin,validateAnnouncement, addAnnouncement);
announcementsRouter.get('/', authenticateTokenAdmin, getAnnouncements);
announcementsRouter.get('/:id', authenticateTokenAdmin, getAnnouncementById);  // Nouvelle route pour obtenir une annonce par ID
announcementsRouter.put('/update/:id', authenticateTokenAdmin, updateAnnouncement);
announcementsRouter.delete('/:id', authenticateTokenAdmin, deleteAnnouncement);

export default announcementsRouter;