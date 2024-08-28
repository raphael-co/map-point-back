import { Request, Response } from 'express';
import pool from '../utils/config/dbConnection';
import { RowDataPacket } from 'mysql2';
import getTranslation from '../utils/translate';  // Importer la fonction de traduction

// Ajouter un commentaire
export const addComment = async (req: Request, res: Response) => {
    const { marker_id, comment, rating } = req.body;
    const userId = req.user?.id;
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue à partir de l'en-tête de requête

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: getTranslation('RATING_BETWEEN_1_AND_5', language, 'controllers', 'commentController') });
    }

    try {
        const connection = await pool.getConnection();
        // Vérifiez si l'utilisateur a déjà commenté ce marqueur
        const [existingComments] = await connection.query<RowDataPacket[]>(
            'SELECT * FROM MarkerComments WHERE marker_id = ? AND user_id = ?',
            [marker_id, userId]
        );

        if (existingComments.length > 0) {
            connection.release();
            return res.status(400).json({ message: getTranslation('ALREADY_COMMENTED', language, 'controllers', 'commentController') });
        }

        await connection.query(
            'INSERT INTO MarkerComments (marker_id, user_id, comment, rating) VALUES (?, ?, ?, ?)',
            [marker_id, userId, comment, rating]
        );
        connection.release();

        res.status(201).json({ message: getTranslation('COMMENT_ADDED_SUCCESS', language, 'controllers', 'commentController') });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'commentController') });
    }
};

// Récupérer les commentaires d'un marqueur
export const getComments = async (req: Request, res: Response) => {
    const { marker_id } = req.params;
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue à partir de l'en-tête de requête

    try {
        const connection = await pool.getConnection();
        const [comments] = await connection.query<RowDataPacket[]>(
            'SELECT MarkerComments.*, users.username FROM MarkerComments JOIN users ON MarkerComments.user_id = users.id WHERE marker_id = ?',
            [marker_id]
        );
        connection.release();

        res.status(200).json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'commentController') });
    }
};

// Mettre à jour un commentaire
export const updateComment = async (req: Request, res: Response) => {
    const { comment_id, comment, rating } = req.body;
    const userId = req.user?.id;
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue à partir de l'en-tête de requête

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: getTranslation('RATING_BETWEEN_1_AND_5', language, 'controllers', 'commentController') });
    }

    try {
        const connection = await pool.getConnection();

        // Vérifiez si le commentaire appartient à l'utilisateur
        const [rows] = await connection.query<RowDataPacket[]>(
            'SELECT user_id FROM MarkerComments WHERE id = ?',
            [comment_id]
        );

        if (rows.length === 0) {
            connection.release();
            return res.status(404).json({ message: getTranslation('COMMENT_NOT_FOUND', language, 'controllers', 'commentController') });
        }

        if (rows[0].user_id !== userId) {
            connection.release();
            return res.status(403).json({ message: getTranslation('UNAUTHORIZED', language, 'controllers', 'commentController') });
        }

        await connection.query(
            'UPDATE MarkerComments SET comment = ?, rating = ? WHERE id = ?',
            [comment, rating, comment_id]
        );
        connection.release();

        res.status(200).json({ message: getTranslation('COMMENT_UPDATED_SUCCESS', language, 'controllers', 'commentController') });
    } catch (error) {
        console.error('Error updating comment:', error);
        res.status(500).json({ message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'commentController') });
    }
};

// Supprimer un commentaire
export const deleteComment = async (req: Request, res: Response) => {
    const { comment_id } = req.params;
    const userId = req.user?.id;
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue à partir de l'en-tête de requête

    try {
        const connection = await pool.getConnection();

        // Vérifiez si le commentaire appartient à l'utilisateur
        const [rows] = await connection.query<RowDataPacket[]>(
            'SELECT user_id FROM MarkerComments WHERE id = ?',
            [comment_id]
        );

        if (rows.length === 0) {
            connection.release();
            return res.status(404).json({ message: getTranslation('COMMENT_NOT_FOUND', language, 'controllers', 'commentController') });
        }

        if (rows[0].user_id !== userId) {
            connection.release();
            return res.status(403).json({ message: getTranslation('UNAUTHORIZED', language, 'controllers', 'commentController') });
        }

        await connection.query(
            'DELETE FROM MarkerComments WHERE id = ?',
            [comment_id]
        );
        connection.release();

        res.status(200).json({ message: getTranslation('COMMENT_DELETED_SUCCESS', language, 'controllers', 'commentController') });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'commentController') });
    }
};
