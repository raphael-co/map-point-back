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
    console.log("createMarker - Start", req.body);
    const { title, description, latitude, longitude, type, ratings, comment, visibility } = req.body;
    const files = req.files as Express.Multer.File[] | undefined;

    if (!title || !latitude || !longitude || !type || !visibility) {
        return res.status(400).json({ status: 'error', message: 'Title, latitude, longitude, type, and visibility are required.' });
    }

    if (!files || files.length < 2) {
        return res.status(400).json({ status: 'error', message: 'At least two images are required.' });
    }

    const userId = req.user?.id;

    try {
        const connection = await pool.getConnection();
        console.log("Database connection established");

        const [result] = await connection.query('INSERT INTO Markers (user_id, title, description, latitude, longitude, visibility, type, comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
            userId,
            title,
            description,
            latitude,
            longitude,
            visibility,
            type,
            comment,
        ]);

        const markerId = (result as RowDataPacket).insertId;
        console.log(`Marker created with ID: ${markerId}`);

        if (typeof ratings === 'object' && ratings !== null) {
            for (const label in ratings) {
                if (Object.prototype.hasOwnProperty.call(ratings, label)) {
                    const decodedLabel = decodeURIComponent(label);
                    const rating = Number(ratings[decodedLabel]);
                    if (!isNaN(rating)) {
                        const [labelResult] = await connection.query<RowDataPacket[]>('SELECT id FROM RatingLabels WHERE marker_type = ? AND label = ?', [type, decodedLabel]);
                        if (labelResult.length > 0) {
                            const labelId = labelResult[0].id;
                            await connection.query('INSERT INTO MarkerRatings (marker_id, label_id, rating) VALUES (?, ?, ?)', [markerId, labelId, rating]);
                            console.log(`Rating added for label ${decodedLabel}: ${rating}`);
                        } else {
                            console.log(`Label not found for type ${type}: ${decodedLabel}`);
                        }
                    }
                }
            }
        }

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
            console.log(`Image uploaded and saved: ${uploadResult.secure_url}`);
        }

        connection.release();
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
            const userId = req.user?.id ?? null;
            const visibility = req.query.visibility as string;

            if (!userId) {
                return res.status(403).json({ status: 'error', message: 'Unauthorized access' });
            }

            let query = `
                SELECT 
                    m.id, m.user_id, m.title, m.description, m.latitude, m.longitude, 
                    m.type, m.comment, m.visibility, JSON_ARRAYAGG(mi.image_url) as images
                FROM Markers m
                LEFT JOIN MarkerImages mi ON m.id = mi.marker_id
                WHERE 
            `;
            let params: (number | null)[] = [];

            switch (visibility) {
                case 'private':
                    query += `m.user_id = ?`;
                    params.push(userId);
                    break;

                case 'friends':
                    query += `(m.visibility = 'friends' AND (
                                    m.user_id = ? OR 
                                    m.user_id IN (
                                        SELECT f.following_id 
                                        FROM followings f 
                                        WHERE f.user_id = ? AND f.status = 'accepted'
                                    )
                                ))`;
                    params.push(userId, userId);
                    break;

                case 'public':
                    query += `(m.visibility = 'public' OR 
                               m.user_id = ? OR 
                               m.user_id IN (
                                  SELECT f.following_id 
                                        FROM followings f 
                                        WHERE f.user_id = ? AND f.status = 'accepted'
                               )
                              )`;
                    params.push(userId, userId);
                    break;

                default:
                    return res.status(400).json({ status: 'error', message: 'Invalid visibility parameter' });
            }

            query += ` GROUP BY m.id`;

            const [markers] = await connection.query<RowDataPacket[]>(query, params);

            if (markers.length === 0) {
                connection.release();
                return res.status(404).json({ status: 'error', message: 'No markers found' });
            }

            // Fetch ratings and labels for each marker
            for (const marker of markers) {
                const [ratings] = await connection.query<RowDataPacket[]>(
                    `SELECT rl.label, mr.rating 
                     FROM MarkerRatings mr
                     JOIN RatingLabels rl ON mr.label_id = rl.id
                     WHERE mr.marker_id = ?`,
                    [marker.id]
                );
                marker.ratings = ratings; // Attach the ratings and labels to each marker
            }

            connection.release();

            res.status(200).json({ status: 'success', data: markers });
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
