import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../utils/config/dbConnection';
import cloudinary from 'cloudinary';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';

dotenv.config();

// Configurez Cloudinary avec vos informations d'identification
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

let io: SocketIOServer;
export const setSocketServer = (ioInstance: SocketIOServer) => {
    io = ioInstance;
};

export const createMarker = async (req: Request, res: Response) => {
    const { title, description, latitude, longitude, type, comfort_rating, noise_rating, cleanliness_rating, accessibility_rating, safety_rating, comment, visibility } = req.body;
    const files = req.files as Express.Multer.File[] | undefined;

    if (!title || !latitude || !longitude || !type || !comfort_rating || !noise_rating || !cleanliness_rating || !accessibility_rating || !safety_rating || !visibility) {
        return res.status(400).json({ status: 'error', message: 'Title, latitude, longitude, and type are required.' });
    }

    if (!files || files.length < 2) {
        return res.status(400).json({ status: 'error', message: 'At least two images are required.' });
    }

    const userId = req.user?.id;

    try {
        const connection = await pool.getConnection();

        const ratings = [comfort_rating, noise_rating, cleanliness_rating, accessibility_rating, safety_rating].map(Number).filter(r => !isNaN(r));
        const overall_rating = ratings.length ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length) : null;

        const [result] = await connection.query('INSERT INTO Markers (user_id, title, description, latitude, longitude, visibility, type, comfort_rating, noise_rating, cleanliness_rating, accessibility_rating, safety_rating, overall_rating, comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
            userId,
            title,
            description,
            latitude,
            longitude,
            visibility,
            type,
            comfort_rating,
            noise_rating,
            cleanliness_rating,
            accessibility_rating,
            safety_rating,
            overall_rating,
            comment,
        ]);

        const markerId = (result as RowDataPacket).insertId;

        for (const file of files) {
            const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
                cloudinary.v2.uploader.upload_stream({ folder: 'mapPoint/markers' }, (error, result) => {
                    if (error) {
                        console.error('Cloudinary upload error:', error);
                        reject(error);
                    } else {
                        resolve(result as { secure_url: string });
                    }
                }).end(file.buffer);
            });
            await connection.query('INSERT INTO MarkerImages (marker_id, user_id, image_url) VALUES (?, ?, ?)', [markerId, userId, uploadResult.secure_url]);
        }

        connection.release();

        // Emit event to all connected clients
        io.emit('markersUpdated');

        res.status(201).json({ status: 'success', message: 'Marker created successfully', markerId });
    } catch (error) {
        console.error('Error creating marker:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

export const getAllMarkers = async (req: Request, res: Response) => {
    try {
        const connection = await pool.getConnection();
        try {
            const userId = req.user?.id ?? null; // Assume that userId is set by a middleware, default to null if undefined
            const visibility = req.query.visibility as string;

            // Build query to get markers with visibility conditions
            let query = `
                SELECT 
                    m.id, m.user_id, m.title, m.description, m.latitude, m.longitude, 
                    m.type, m.comfort_rating, m.noise_rating, m.cleanliness_rating, 
                    m.accessibility_rating, m.safety_rating, m.overall_rating, m.comment,
                    m.visibility, GROUP_CONCAT(mi.image_url) as images
                FROM Markers m
                LEFT JOIN MarkerImages mi ON m.id = mi.marker_id
                WHERE 
            `;

            let params: (number | null)[] = [];

            switch (visibility) {
                case 'private':
                    if (userId !== null) {
                        query += `m.user_id = ?`;
                        params.push(userId);
                    } else {
                        return res.status(403).json({ status: 'error', message: 'Unauthorized access' });
                    }
                    break;

                case 'friends':
                    if (userId !== null) {
                        query += `(m.visibility = 'friends' AND m.user_id IN (
                                    SELECT f.user_id FROM followers f WHERE f.follower_id = ? AND f.status = 'accepted'
                                )) OR (m.user_id = ?')`;
                        params.push(userId, userId);
                    } else {
                        return res.status(403).json({ status: 'error', message: 'Unauthorized access' });
                    }
                    break;

                case 'public':
                    query += `m.visibility = 'public' OR m.user_id = ? OR (m.visibility = 'friends' AND m.user_id IN (
                                SELECT f.user_id FROM followers f WHERE f.follower_id = ? AND f.status = 'accepted'
                            ))`;
                    params.push(userId, userId);
                    break;

                default:
                    return res.status(400).json({ status: 'error', message: 'Invalid visibility parameter' });
            }

            query += ` GROUP BY m.id`;

            // Execute query
            const [rows] = await connection.query<RowDataPacket[]>(query, params);

            console.log(rows);
            
            connection.release();

            if (rows.length === 0) {
                return res.status(404).json({ status: 'error', message: 'No markers found' });
            }

            res.status(200).json({ status: 'success', data: rows });
        } catch (error) {
            connection.release();
            console.error('Error fetching markers:', error);
            res.status(500).json({ status: 'error', message: 'Internal server error' });
        }
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
