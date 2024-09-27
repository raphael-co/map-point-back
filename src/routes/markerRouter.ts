import { Router } from 'express';
import { createMarker, deleteMarker, getAllMarkers, getAllMarkersUserConnect, getMarkersById, getMarkersByUser, updateMarker } from '../controllers/markerController';
import { authenticateToken } from '../middleweares/authMiddleweares';
import { validateCreateMarker, validateUpdateMarker } from '../middleweares/markerMiddlewares';
import { addLabels, getLabelsWithMarkerType } from '../controllers/labelController';
import { InserUserActif } from '../middleweares/usersActif/usersActif';

const markerRouter = Router();

markerRouter.post('/create', authenticateToken, InserUserActif, validateCreateMarker, createMarker);
markerRouter.get('/', authenticateToken, InserUserActif, getAllMarkers);
markerRouter.put('/update/:id', authenticateToken, InserUserActif, validateUpdateMarker, updateMarker);
markerRouter.get('/user', authenticateToken, InserUserActif, getAllMarkersUserConnect);
markerRouter.get('/user/:userId', authenticateToken, InserUserActif, getMarkersByUser);

markerRouter.get('/:id', authenticateToken, getMarkersById);


// Route pour ajouter plusieurs labels à un type de marqueur
markerRouter.post('/addLabels', authenticateToken, addLabels);

// Route pour récupérer les labels en fonction du type de marqueur
markerRouter.get('/labels/:markerType', authenticateToken, getLabelsWithMarkerType);

markerRouter.delete('/delete/:id', authenticateToken, deleteMarker);

export default markerRouter;
