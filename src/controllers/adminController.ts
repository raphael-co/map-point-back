import { Request, Response } from 'express';
import pool from '../utils/config/dbConnection';
import { RowDataPacket } from 'mysql2';
import fs from 'fs/promises';
import getTranslation from '../utils/translate';  // Fonction de traduction
import cloudinary from 'cloudinary';
import dotenv from 'dotenv';
import { getDistanceFromLatLonInMeters } from './markerController';

dotenv.config();

// Configurez Cloudinary avec vos informations d'identification
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const getAllMarkersAdmin = async (req: Request, res: Response) => {
    const language = 'fr'; // Determine the language from the request header

    try {
        const connection = await pool.getConnection();
        try {
            const userRole = req.user?.role;
            const visibility = req.query.visibility as string;
            const markerTypes = req.query.type; // Get marker types from query parameters

            if (!userRole || userRole !== 'admin') {
                console.log('getAllMarkersAdmin - Unauthorized access attempt by non-admin');
                return res.status(403).json({ status: 'error', message: getTranslation('UNAUTHORIZED_ACCESS', language, 'controllers', 'markerController') });
            }

            let query = `
                SELECT 
                    m.id, m.user_id, m.title, m.description, m.latitude, m.longitude, 
                    m.type, m.comment, m.visibility, m.blocked, 
                    IFNULL(
                        (SELECT JSON_ARRAYAGG(JSON_OBJECT('url', mi.image_url)) 
                         FROM MarkerImages mi 
                         WHERE mi.marker_id = m.id),
                        JSON_ARRAY()
                    ) as images
                FROM Markers m
                LEFT JOIN MarkerImages mi ON m.id = mi.marker_id
                WHERE 
            `;
            let params: string[] = [];

            switch (visibility) {
                case 'private':
                    query += `m.visibility = 'private'`;
                    break;
                case 'friends':
                    query += `m.visibility = 'friends'`;
                    break;
                case 'public':
                    query += `m.visibility = 'public'`;
                    break;
                case 'all':
                    query += `m.visibility IN ('public', 'friends', 'private')`;
                    break;
                default:
                    return res.status(400).json({ status: 'error', message: getTranslation('INVALID_VISIBILITY_PARAMETER', language, 'controllers', 'markerController') });
            }

            // Add marker type filter if provided
            if (markerTypes) {
                // Ensure markerTypes is treated as an array of strings
                const typesArray: string[] = Array.isArray(markerTypes)
                    ? markerTypes.map(type => String(type))
                    : [String(markerTypes)];

                const placeholders = typesArray.map(() => '?').join(', '); // Create placeholders for SQL query
                query += ` AND m.type IN (${placeholders})`;
                params.push(...typesArray);

            }

            query += ` GROUP BY m.id`;

            const [markers] = await connection.query<RowDataPacket[]>(query, params);

            if (markers.length === 0) {
                connection.release();
                console.log('getAllMarkers - No markers found');
                return res.status(404).json({ status: 'error', message: getTranslation('NO_MARKERS_FOUND', language, 'controllers', 'markerController') });
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

            // Format the markers to ensure correct JSON structure
            const formattedMarkers = markers.map(marker => ({
                ...marker,
                images: JSON.parse(marker.images), // Parse images into JSON array
            }));

            connection.release();

            res.status(200).json({ status: 'success', data: formattedMarkers });
        } catch (error) {
            connection.release();
            console.error('Error fetching markers:', error);
            res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'markerController') });
        }
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'markerController') });
    }
}

export const updateMarkerBlockedStatus = async (req: Request, res: Response) => {
    const connection = await pool.getConnection();
    const markerId = req.body.markerId; // ID of the marker to update
    const blockedStatus = req.body.blocked; // Expected to be 'true' or 'false'
    const userRole = req.user?.role;

    try {

        if (!userRole || userRole !== 'admin') {
            console.log('getAllMarkersAdmin - Unauthorized access attempt by non-admin');
            return res.status(403).json({ status: 'error', message: 'Unauthorized access attempt by non-admin.'});
        }
        const [markerExists] = await connection.query<RowDataPacket[]>(
            `SELECT id FROM Markers WHERE id = ?`,
            [markerId]
        );

        if (markerExists.length === 0) {
            connection.release();
            return res.status(404).json({ status: 'error', message: 'Marker not found.' });
        }

        // Update the 'blocked' status of the marker
        await connection.query(
            `UPDATE Markers SET blocked = ? WHERE id = ?`,
            [blockedStatus, markerId]
        );

        connection.release();
        res.status(200).json({ status: 'success', message: 'Marker blocked status updated successfully.' });
    } catch (error) {
        connection.release();
        console.error('Error updating marker blocked status:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error while updating marker status.' });
    }
};

export const updateMarkerAdmin = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, description, latitude, longitude, type, ratings, comment, visibility, userId } = req.body;
    const files = req.files as Express.Multer.File[] | undefined;
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue à partir de l'en-tête de requête

    if (!id || !userId) {
        return res.status(400).json({ status: 'error', message: getTranslation('MARKER_ID_USER_ID_REQUIRED', language, 'controllers', 'markerController') });
    }

    try {
        const connection = await pool.getConnection();

        // Check if the marker exists and belongs to the user
        const [existingMarker] = await connection.query<RowDataPacket[]>(
            `SELECT * FROM Markers WHERE id = ? AND user_id = ?`,
            [id, userId]
        );

        if (existingMarker.length === 0) {
            connection.release();
            return res.status(404).json({ status: 'error', message: getTranslation('MARKER_NOT_FOUND_UNAUTHORIZED_ACCESS', language, 'controllers', 'markerController') });
        }

        const previousType = existingMarker[0].type;

        // Update the marker's details
        await connection.query(
            `UPDATE Markers SET title = ?, description = ?, type = ?, visibility = ?, comment = ? WHERE id = ?`,
            [title, description, type, visibility, comment, id]
        );

        // Handle ratings update
        if (typeof ratings === 'object' && ratings !== null) {

            // Si le type change, supprimer les anciens ratings
            if (previousType !== type) {
                await connection.query(`DELETE FROM MarkerRatings WHERE marker_id = ?`, [id]);

                // Insérer les nouveaux ratings
                for (const label in ratings) {
                    if (Object.prototype.hasOwnProperty.call(ratings, label)) {
                        const decodedLabel = decodeURIComponent(label);
                        const rating = Number(ratings[decodedLabel]);
                        if (!isNaN(rating)) {
                            const [labelResult] = await connection.query<RowDataPacket[]>('SELECT id FROM RatingLabels WHERE marker_type = ? AND label = ?', [type, decodedLabel]);
                            if (labelResult.length > 0) {
                                const labelId = labelResult[0].id;
                                await connection.query(
                                    'INSERT INTO MarkerRatings (marker_id, label_id, rating) VALUES (?, ?, ?)',
                                    [id, labelId, rating]
                                );
                            }
                        }
                    }
                }
            } else {
                // Si le type ne change pas, mettre à jour les ratings existants ou insérer les nouveaux
                for (const label in ratings) {
                    if (Object.prototype.hasOwnProperty.call(ratings, label)) {
                        const decodedLabel = decodeURIComponent(label);
                        const rating = Number(ratings[decodedLabel]);
                        
                        if (!isNaN(rating)) {
                            const [labelResult] = await connection.query<RowDataPacket[]>('SELECT id FROM RatingLabels WHERE marker_type = ? AND label = ?', [type, decodedLabel]);
                            
                            if (labelResult.length > 0) {
                                const labelId = labelResult[0].id;

                                // Check if the rating already exists for this marker and label
                                const [existingRating] = await connection.query<RowDataPacket[]>(
                                    'SELECT * FROM MarkerRatings WHERE marker_id = ? AND label_id = ?',
                                    [id, labelId]
                                );

                                if (existingRating.length > 0) {
                                    // Update the existing rating
                                    await connection.query(
                                        'UPDATE MarkerRatings SET rating = ? WHERE marker_id = ? AND label_id = ?',
                                        [rating, id, labelId]
                                    );
                                } else {
                                    // Insert new rating if not exists
                                    await connection.query(
                                        'INSERT INTO MarkerRatings (marker_id, label_id, rating) VALUES (?, ?, ?)',
                                        [id, labelId, rating]
                                    );
                                }
                            }
                        }
                    }
                }
            }
        }

        const markerLat = existingMarker[0].latitude;
        const markerLon = existingMarker[0].longitude;

        // Handle image updates
        console.log(files);

        if (files && files.length > 0) {

            console.log(files);
            
            // Fetch current images
            const [currentImages] = await connection.query<RowDataPacket[]>(
                `SELECT id, image_url FROM MarkerImages WHERE marker_id = ?`,
                [id]
            );

            const currentImageUrls = currentImages.map(image => image.image_url);

            // Upload new images
            for (const file of files) {
                const existingFile = currentImageUrls.find(url => url.includes(file.originalname));
                if (!existingFile) {
                    if (latitude && longitude) {
                        const distance = getDistanceFromLatLonInMeters(latitude, longitude, markerLat, markerLon);
                        if (distance > 30) {
                            connection.release();
                            return res.status(403).json({ status: 'error', message: getTranslation('TOO_FAR_TO_UPDATE_IMAGES', language, 'controllers', 'markerController') });
                        }
                    } else {
                        connection.release();
                        return res.status(400).json({ status: 'error', message: getTranslation('USER_LOCATION_REQUIRED', language, 'controllers', 'markerController') });
                    }

                    // Only upload if the image is not already uploaded
                    const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
                        cloudinary.v2.uploader.upload_stream({
                            folder: 'mapPoint/markers',
                            transformation: { width: 1000, height: 1000, crop: "limit" }, // Limit image size
                            resource_type: "image"
                        }, (error, result) => {
                            if (error) {
                                console.error('Cloudinary upload error:', error);
                                reject(error);
                            } else {
                                resolve(result as { secure_url: string });
                            }
                        }).end(file.buffer);
                    });
                    await connection.query('INSERT INTO MarkerImages (marker_id, user_id, image_url) VALUES (?, ?, ?)', [id, userId, uploadResult.secure_url]);
                }
            }

            // Delete old images that are not in the new files
            for (const currentImage of currentImages) {
                const fileToDelete = files.some(file => file.originalname === currentImage.image_url.split('/').pop());
                if (!fileToDelete) {
                    // Delete the image from Cloudinary
                    const publicId = currentImage.image_url.split('/').pop()?.split('.')[0];
                    if (publicId) {
                        await cloudinary.v2.uploader.destroy(`mapPoint/markers/${publicId}`);
                    }
                    // Delete the image record from the database
                    await connection.query('DELETE FROM MarkerImages WHERE id = ?', [currentImage.id]);
                }
            }
        }

        connection.release();
        // io.emit('markersUpdated');
        res.status(200).json({ status: 'success', message: 'MARKER_UPDATED_SUCCESS' });
    } catch (error) {
        console.error('Error updating marker:', error);
        res.status(500).json({ status: 'error', message: 'INTERNAL_SERVER_ERROR' });
    }
};


export const getMarkersByIdAdmin = async (req: Request, res: Response) => {
    const { id } = req.params;
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue à partir de l'en-tête de requête

    try {
        const connection = await pool.getConnection();
        try {
            const [marker] = await connection.query<RowDataPacket[]>(
                `SELECT m.id, m.user_id, m.title, m.description, m.latitude, m.longitude, 
                        m.type, m.visibility, m.comment,
                        IFNULL(
                            (SELECT JSON_ARRAYAGG(JSON_OBJECT('url', mi.image_url)) 
                             FROM MarkerImages mi 
                             WHERE mi.marker_id = m.id),
                            JSON_ARRAY()
                        ) as images,
                        (SELECT IFNULL(AVG(mr.rating), 0) FROM MarkerRatings mr WHERE mr.marker_id = m.id) as average_rating,
                        (SELECT COUNT(*) FROM MarkerComments mc WHERE mc.marker_id = m.id) as comments_count
                 FROM Markers m
                 WHERE m.id = ?`,
                [id]
            );

            if (marker.length === 0) {
                connection.release();
                return res.status(404).json({ status: 'error', message: getTranslation('MARKER_NOT_FOUND', language, 'controllers', 'markerController') });
            }

            // Fetch ratings and labels for the marker
            const [ratings] = await connection.query<RowDataPacket[]>(
                `SELECT rl.label, mr.rating 
                 FROM MarkerRatings mr
                 JOIN RatingLabels rl ON mr.label_id = rl.id
                 WHERE mr.marker_id = ?`,
                [id]
            );

            const formattedMarker = {
                ...marker[0],
                images: JSON.parse(marker[0].images),
                ratings: ratings
            };

            connection.release();
            res.status(200).json({ status: 'success', data: formattedMarker });
        } catch (error) {
            connection.release();
            console.error('Error fetching marker:', error);
            res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'markerController') });
        }
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'markerController') });
    }
}