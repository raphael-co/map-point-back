import { Router, Request, Response } from 'express';
import pool from '../utils/config/dbConnection';

import { createMarker, getAllMarkers, getAllMarkersUserConnect, getMarkersByUser, updateMarker } from '../controllers/markerController';
import { authenticateToken } from '../middleweares/authMiddleweares';
import { validateCreateMarker, validateUpdateMarker } from '../middleweares/markerMiddlewares';
import { RowDataPacket } from 'mysql2';

const markerRouter = Router();

markerRouter.post('/create', authenticateToken, validateCreateMarker, createMarker);
markerRouter.get('/', authenticateToken, getAllMarkers);
markerRouter.put('/update/:id', authenticateToken, validateUpdateMarker, updateMarker); // New update route
markerRouter.get('/user', authenticateToken, getAllMarkersUserConnect);
markerRouter.get('/user/:userId', authenticateToken, getMarkersByUser);

// Route pour ajouter plusieurs labels à un type de marqueur
markerRouter.post('/addLabels', authenticateToken, async (req: Request, res: Response) => {
    const { markerType, labels } = req.body;

    if (!markerType || !Array.isArray(labels) || labels.length === 0) {
        return res.status(400).json({ status: 'error', message: 'markerType and labels are required, and labels should be a non-empty array.' });
    }

    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            for (const label of labels) {
                const [existingLabel] = await connection.query<RowDataPacket[]>(
                    'SELECT id FROM RatingLabels WHERE marker_type = ? AND label = ?',
                    [markerType, label]
                );

                if (existingLabel.length === 0) {
                    await connection.query('INSERT INTO RatingLabels (marker_type, label) VALUES (?, ?)', [markerType, label]);
                }
            }

            await connection.commit();
            connection.release();
            res.status(201).json({ status: 'success', message: 'Labels added successfully.' });

        } catch (err) {
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

// Route pour récupérer les labels en fonction du type de marqueur
markerRouter.get('/labels/:markerType', authenticateToken, async (req: Request, res: Response) => {
    const { markerType } = req.params;

    try {
        const connection = await pool.getConnection();
        try {
            const [labels] = await connection.query<RowDataPacket[]>(
                'SELECT label FROM RatingLabels WHERE marker_type = ?',
                [markerType]
            );

            if (labels.length === 0) {
                connection.release();
                return res.status(404).json({ status: 'error', message: `No labels found for marker type ${markerType}` });
            }

            connection.release();
            res.status(200).json({ status: 'success', data: labels });
        } catch (err) {
            connection.release();
            console.error('Error fetching labels:', err);
            res.status(500).json({ status: 'error', message: 'Internal server error' });
        }
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

export default markerRouter;
