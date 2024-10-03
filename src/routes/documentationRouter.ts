import { Router } from 'express';
import { authenticateToken, authenticateTokenAdmin } from '../middleweares/authMiddleweares';

import { InserUserActif } from '../middleweares/usersActif/usersActif';
import { validateDocumentation } from '../middleweares/documentationMiddlewares';
import { addDocumentation, deleteDocumentation, deleteDocumentations, getDocumentationById, getDocumentations, getDocumentationTitles, updateDocumentation } from '../controllers/documentationController';

const documentationRouter = Router();

// Routes pour la documentation
documentationRouter.post('/add', authenticateTokenAdmin, InserUserActif, validateDocumentation, addDocumentation);
documentationRouter.get('/', authenticateToken, InserUserActif, getDocumentations);
documentationRouter.get('/:id', authenticateToken, InserUserActif, getDocumentationById);
documentationRouter.put('/update/:id', authenticateTokenAdmin, InserUserActif, validateDocumentation, updateDocumentation);
documentationRouter.delete('/:id', authenticateTokenAdmin, InserUserActif, deleteDocumentation);
documentationRouter.post('/delete-multiple', authenticateTokenAdmin, InserUserActif, deleteDocumentations);
documentationRouter.get('/titles', authenticateToken, InserUserActif, getDocumentationTitles);

export default documentationRouter;
