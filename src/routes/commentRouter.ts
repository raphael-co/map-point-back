import express from 'express';
import { addComment, deleteComment, getComments, updateComment } from '../controllers/commentController';
import { authenticateToken } from '../middleweares/authMiddleweares';


const commentRouter = express.Router();

commentRouter.post('/add', authenticateToken, addComment);
commentRouter.get('/:marker_id', authenticateToken, getComments);
commentRouter.put('/update', authenticateToken, updateComment);
commentRouter.delete('/:comment_id', authenticateToken, deleteComment);

export default commentRouter;
