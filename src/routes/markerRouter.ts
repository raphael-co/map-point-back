import { Router } from 'express';
import { createMarker, getAllMarkers, getAllMarkersUserConnect, getMarkersById, getMarkersByUser, updateMarker } from '../controllers/markerController';
import { authenticateToken } from '../middleweares/authMiddleweares';
import { validateCreateMarker, validateUpdateMarker } from '../middleweares/markerMiddlewares';
import { addLabels ,getLabelsWithMarkerType} from '../controllers/labelController';

const markerRouter = Router();

markerRouter.post('/create', authenticateToken, validateCreateMarker, createMarker);
markerRouter.get('/', authenticateToken, getAllMarkers);
markerRouter.put('/update/:id', authenticateToken, validateUpdateMarker, updateMarker); // New update route
markerRouter.get('/user', authenticateToken, getAllMarkersUserConnect);
markerRouter.get('/user/:userId', authenticateToken, getMarkersByUser);

markerRouter.get('/:id', authenticateToken,getMarkersById);


// Route pour ajouter plusieurs labels à un type de marqueur
markerRouter.post('/addLabels', authenticateToken, addLabels);

// Route pour récupérer les labels en fonction du type de marqueur
markerRouter.get('/labels/:markerType', authenticateToken, getLabelsWithMarkerType);

export default markerRouter;
