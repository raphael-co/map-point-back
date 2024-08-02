import { Request, Response } from 'express';
import pool from '../utils/config/dbConnection';
import { RowDataPacket } from 'mysql2';

// Ajouter un commentaire
export const addComment = async (req: Request, res: Response) => {
    const { marker_id, comment, rating } = req.body;
    const userId = req.user?.id;

    try {
        const connection = await pool.getConnection();
        // Vérifiez si l'utilisateur a déjà commenté ce marqueur
        const [existingComments] = await connection.query<RowDataPacket[]>(
            'SELECT * FROM MarkerComments WHERE marker_id = ? AND user_id = ?',
            [marker_id, userId]
        );

        if (existingComments.length > 0) {
            connection.release();
            return res.status(400).json({ message: 'You have already commented on this marker.' });
        }

        await connection.query(
            'INSERT INTO MarkerComments (marker_id, user_id, comment, rating) VALUES (?, ?, ?, ?)',
            [marker_id, userId, comment, rating]
        );
        connection.release();

        res.status(201).json({ message: 'Comment added successfully' });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Mettre à jour un commentaire
export const updateComment = async (req: Request, res: Response) => {
    const { comment_id, comment, rating } = req.body;
    const userId = req.user?.id;

    try {
        const connection = await pool.getConnection();

        // Vérifiez si le commentaire appartient à l'utilisateur
        const [rows] = await connection.query<RowDataPacket[]>(
            'SELECT user_id FROM MarkerComments WHERE id = ?',
            [comment_id]
        );

        if (rows.length === 0) {
            connection.release();
            return res.status(404).json({ message: 'Comment not found' });
        }

        if (rows[0].user_id !== userId) {
            connection.release();
            return res.status(403).json({ message: 'Unauthorized' });
        }

        await connection.query(
            'UPDATE MarkerComments SET comment = ?, rating = ? WHERE id = ?',
            [comment, rating, comment_id]
        );
        connection.release();

        res.status(200).json({ message: 'Comment updated successfully' });
    } catch (error) {
        console.error('Error updating comment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Récupérer les commentaires d'un marqueur
export const getComments = async (req: Request, res: Response) => {
    const { marker_id } = req.params;

    try {
        const connection = await pool.getConnection();
        const [comments] = await connection.query(
            'SELECT MarkerComments.*, users.username FROM MarkerComments JOIN users ON MarkerComments.user_id = users.id WHERE marker_id = ?',
            [marker_id]
        );
        connection.release();

        res.status(200).json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Supprimer un commentaire
export const deleteComment = async (req: Request, res: Response) => {
    const { comment_id } = req.params;
    const userId = req.user?.id;

    try {
        const connection = await pool.getConnection();

        // Vérifiez si le commentaire appartient à l'utilisateur
        const [rows] = await connection.query<RowDataPacket[]>(
            'SELECT user_id FROM MarkerComments WHERE id = ?',
            [comment_id]
        );

        if (rows.length === 0) {
            connection.release();
            return res.status(404).json({ message: 'Comment not found' });
        }

        if (rows[0].user_id !== userId) {
            connection.release();
            return res.status(403).json({ message: 'Unauthorized' });
        }

        await connection.query(
            'DELETE FROM MarkerComments WHERE id = ?',
            [comment_id]
        );
        connection.release();

        res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
