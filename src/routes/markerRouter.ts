import { Router, Request, Response } from 'express';
import pool from '../utils/config/dbConnection';

import { createMarker, getAllMarkers } from '../controllers/markerController';
import { authenticateToken } from '../middleweares/authMiddleweares';
import { validateCreateMarker } from '../middleweares/markerMiddlewares';
import { RowDataPacket } from 'mysql2';

const markerRouter = Router();

markerRouter.post('/create', authenticateToken, validateCreateMarker, createMarker);
markerRouter.get('/', authenticateToken, getAllMarkers);

// Route pour ajouter plusieurs labels à un type de marqueur
markerRouter.post('/addLabels', authenticateToken, async (req: Request, res: Response) => {
    const { markerType, labels } = req.body;

    if (!markerType || !Array.isArray(labels) || labels.length === 0) {
        return res.status(400).json({ status: 'error', message: 'markerType and labels are required, and labels should be a non-empty array.' });
    }

    try {
        const connection = await pool.getConnection();

        // Commence une transaction
        await connection.beginTransaction();

        try {
            for (const label of labels) {
                // Vérifier si le label existe déjà pour ce markerType
                const [existingLabel] = await connection.query<RowDataPacket[]>(
                    'SELECT id FROM RatingLabels WHERE marker_type = ? AND label = ?',
                    [markerType, label]
                );

                // Ajouter le label seulement s'il n'existe pas déjà
                if (existingLabel.length === 0) {
                    await connection.query('INSERT INTO RatingLabels (marker_type, label) VALUES (?, ?)', [markerType, label]);
                }
            }

            // Valide la transaction
            await connection.commit();
            connection.release();
            res.status(201).json({ status: 'success', message: 'Labels added successfully.' });

        } catch (err) {
            // En cas d'erreur, annule la transaction
            await connection.rollback();
            connection.release();
            console.error('Error adding labels:', err);
            res.status(500).json({ status: 'error', message: 'Failed to add labels.' });
        }
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});


export default markerRouter;
