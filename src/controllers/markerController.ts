import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../utils/config/dbConnection';
import cloudinary from 'cloudinary';
import dotenv from 'dotenv';
import { notifyFollowers } from './notificationsController';
import getTranslation from '../utils/translate';  // Importer la fonction de traduction
import { getUserById } from '../utils/userUtils';

dotenv.config();

// Configurez Cloudinary avec vos informations d'identification
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const createMarker = async (req: Request, res: Response) => {
    console.log("createMarker - Start", req.body);
    const { title, description, latitude, longitude, type, ratings, comment, visibility } = req.body;
    const files = req.files as Express.Multer.File[] | undefined;
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue à partir de l'en-tête de requête

    if (!title || !latitude || !longitude || !type || !visibility) {
        return res.status(400).json({ status: 'error', message: getTranslation('REQUIRED_FIELDS_MISSING', language, 'controllers', 'markerController') });
    }

    if (!files || files.length < 2) {
        return res.status(400).json({ status: 'error', message: getTranslation('TWO_IMAGES_REQUIRED', language, 'controllers', 'markerController') });
    }

    const userId = req.user!.id;

    const user = await getUserById(userId);
    if (!user) {
        return res.status(404).json({ status: 'error', message: getTranslation('USER_NOT_FOUND', language, 'controllers', 'friendController') });
    }

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

        const imageUploadPromises = files.map(file =>
            new Promise<{ secure_url: string }>((resolve, reject) => {
                cloudinary.v2.uploader.upload_stream({
                    folder: 'mapPoint/markers',
                    transformation: { width: 1000, height: 1000, crop: "limit" }, // Limite la taille de l'image
                    resource_type: "image"
                }, (error, result) => {
                    if (error) {
                        console.error('Cloudinary upload error:', error);
                        reject(error);
                    } else {
                        resolve(result as { secure_url: string });
                    }
                }).end(file.buffer);
            }).then(uploadResult =>
                connection.query('INSERT INTO MarkerImages (marker_id, user_id, image_url) VALUES (?, ?, ?)', [markerId, userId, uploadResult.secure_url])
            )
        );

        // Répondre au client immédiatement avant de gérer les notifications

        // Commencer le traitement des images
        await Promise.all(imageUploadPromises);

        // Notifier les followers

        // Notifier les followers avec la nouvelle notification de création de marker
        const notificationContent = getTranslation('NEW_MARKER_NOTIFICATION', language, 'controllers', 'markerController').replace('{username}', user.username).replace('{title}', title);
        await notifyFollowers(userId, 'marker', notificationContent, 'accepted', user, markerId);

        connection.release();
        // io.emit('markersUpdated');

        return res.status(201).json({ status: 'success', message: getTranslation('MARKER_CREATED_SUCCESS', language, 'controllers', 'markerController'), markerId });

    } catch (error) {
        console.error('Error creating marker:', error);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'markerController') });
    }
};


export const getAllMarkers = async (req: Request, res: Response) => {
    const language = req.headers['accept-language'] || 'en'; // Determine the language from the request header

    try {
        const connection = await pool.getConnection();
        try {
            const userId = req.user?.id ?? null;
            const visibility = req.query.visibility as string;
            const markerTypes = req.query.type; // Get marker types from query parameters

            if (!userId) {
                return res.status(403).json({ status: 'error', message: getTranslation('UNAUTHORIZED_ACCESS', language, 'controllers', 'markerController') });
            }

            let query = `
                SELECT 
                    m.id, m.user_id, m.title, m.description, m.latitude, m.longitude, 
                    m.type, m.comment, m.visibility, 
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
            let params: (number | string | null)[] = [];

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

                case 'all':
                    // 'All' visibility means no additional filter, allowing all records.
                    query += `(m.visibility IN ('public', 'friends', 'private') OR 
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
};

export const getAllMarkersUserConnect = async (req: Request, res: Response) => {
    const connection = await pool.getConnection();
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue à partir de l'en-tête de requête
    try {
        const userId = req.user?.id ?? null;

        if (!userId) {
            return res.status(403).json({ status: 'error', message: getTranslation('UNAUTHORIZED_ACCESS', language, 'controllers', 'markerController') });
        }

        const [markers] = await connection.query<RowDataPacket[]>(
            `SELECT m.id, m.user_id, m.title, m.description, m.latitude, m.longitude, 
                    m.type, m.visibility, 
                    IFNULL(
                        (SELECT JSON_ARRAYAGG(JSON_OBJECT('url', mi.image_url)) 
                         FROM MarkerImages mi 
                         WHERE mi.marker_id = m.id),
                        JSON_ARRAY()
                    ) as images,
                    (SELECT COUNT(*) FROM MarkerComments mc WHERE mc.marker_id = m.id) as comments_count,
                    (SELECT IFNULL(AVG(mr.rating), 0) FROM MarkerRatings mr WHERE mr.marker_id = m.id) as average_rating,
                    (SELECT IFNULL(AVG(mc.rating), 0) FROM MarkerComments mc WHERE mc.marker_id = m.id) as average_comment_rating
                FROM Markers m
                WHERE m.user_id = ?
                GROUP BY m.id`,
            [userId]
        );

        const formattedMarkers = markers.map(marker => ({
            ...marker,
            images: JSON.parse(marker.images),
            comments_count: Number(marker.comments_count),
            average_rating: Number(marker.average_rating),
            average_comment_rating: Number(marker.average_comment_rating), // New field for average comment rating
        }));

        connection.release();

        res.status(200).json({ status: 'success', data: formattedMarkers });
    } catch (err) {
        connection.release();
        console.error('Error fetching markers:', err);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'markerController') });
    }
};

export const getMarkersByUser = async (req: Request, res: Response) => {
    const connection = await pool.getConnection();
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue à partir de l'en-tête de requête
    try {
        const currentUserId = req.user?.id ?? null;
        const targetUserId = parseInt(req.params.userId, 10);

        if (!currentUserId) {
            return res.status(403).json({ status: 'error', message: getTranslation('UNAUTHORIZED_ACCESS', language, 'controllers', 'markerController') });
        }

        // Check if the current user is an accepted follower of the target user
        const [followerRows] = await connection.query<RowDataPacket[]>(
            `SELECT status FROM followers WHERE user_id = ? AND follower_id = ? AND status = 'accepted'`,
            [targetUserId, currentUserId]
        );

        const isFollower = followerRows.length > 0;

        // Get markers along with the number of comments, average rating, and average comment rating using subqueries
        const [markers] = await connection.query<RowDataPacket[]>(
            `SELECT m.id, m.user_id, m.title, m.description, m.latitude, m.longitude, 
                    m.type, m.visibility, 
                    IFNULL(
                        (SELECT JSON_ARRAYAGG(JSON_OBJECT('url', mi.image_url)) 
                         FROM MarkerImages mi 
                         WHERE mi.marker_id = m.id),
                        JSON_ARRAY()
                    ) as images,
                    (SELECT COUNT(*) FROM MarkerComments mc WHERE mc.marker_id = m.id) as comments_count,
                    (SELECT IFNULL(AVG(mr.rating), 0) FROM MarkerRatings mr WHERE mr.marker_id = m.id) as average_rating,
                    (SELECT IFNULL(AVG(mc.rating), 0) FROM MarkerComments mc WHERE mc.marker_id = m.id) as average_comment_rating
                FROM Markers m
                WHERE m.user_id = ?
                AND (m.visibility = 'public' OR (m.visibility = 'friends' AND ?))`,
            [targetUserId, isFollower]
        );

        const formattedMarkers = markers.map(marker => ({
            ...marker,
            images: JSON.parse(marker.images),
            comments_count: Number(marker.comments_count),
            average_rating: Number(marker.average_rating),
            average_comment_rating: Number(marker.average_comment_rating), // New field for average comment rating
        }));

        connection.release();

        res.status(200).json({ status: 'success', data: formattedMarkers });
    } catch (err) {
        connection.release();
        console.error('Error fetching markers:', err);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'markerController') });
    }
};


const getDistanceFromLatLonInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Rayon de la Terre en mètres
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance en mètres
    return distance;
};

export const updateMarker = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, description, latitude, longitude, type, ratings, comment, visibility } = req.body;
    const files = req.files as Express.Multer.File[] | undefined;
    const userId = req.user?.id;
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

        // Update the marker's details
        await connection.query(
            `UPDATE Markers SET title = ?, description = ?, type = ?, visibility = ?, comment = ? WHERE id = ?`,
            [title, description, type, visibility, comment, id]
        );

        // Handle ratings update
        if (typeof ratings === 'object' && ratings !== null) {
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
                                // Insert new rating
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
        const markerLat = existingMarker[0].latitude;
        const markerLon = existingMarker[0].longitude;


        // Handle image updates
        if (files && files.length > 0) {
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
                        console.log(existingFile);

                        console.log('latitude:', latitude, 'longitude:', longitude);
                        console.log('markerLat:', markerLat, 'markerLon:', markerLon);

                        const distance = getDistanceFromLatLonInMeters(latitude, longitude, markerLat, markerLon);
                        if (distance > 30) {
                            console.log('trop loin');
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
        res.status(200).json({ status: 'success', message: getTranslation('MARKER_UPDATED_SUCCESS', language, 'controllers', 'markerController') });
    } catch (error) {
        console.error('Error updating marker:', error);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'markerController') });
    }
};

export const deleteMarker = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
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

        // Fetch images associated with the marker
        const [images] = await connection.query<RowDataPacket[]>(
            `SELECT id, image_url FROM MarkerImages WHERE marker_id = ?`,
            [id]
        );

        // Delete images from Cloudinary
        for (const image of images) {
            const publicId = image.image_url.split('/').pop()?.split('.')[0];
            if (publicId) {
                await cloudinary.v2.uploader.destroy(`mapPoint/markers/${publicId}`);
            }
        }

        // Delete image records from the database
        await connection.query('DELETE FROM MarkerImages WHERE marker_id = ?', [id]);

        // Delete ratings associated with the marker
        await connection.query('DELETE FROM MarkerRatings WHERE marker_id = ?', [id]);

        // Delete comments associated with the marker
        await connection.query('DELETE FROM MarkerComments WHERE marker_id = ?', [id]);

        // Finally, delete the marker itself
        await connection.query('DELETE FROM Markers WHERE id = ? AND user_id = ?', [id, userId]);

        connection.release();
        // io.emit('markersUpdated');
        res.status(200).json({ status: 'success', message: getTranslation('MARKER_DELETED_SUCCESS', language, 'controllers', 'markerController') });
    } catch (error) {
        console.error('Error deleting marker:', error);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'markerController') });
    }
};

export const getAllMarkersUserProfile = async (req: Request, res: Response) => {
    const { userProfileId } = req.params; // ID du profil utilisateur ciblé
    const userId = req.user?.id; // ID de l'utilisateur connecté
    const connection = await pool.getConnection();
    const language = req.headers['accept-language'] || 'en'; // Déterminer la langue à partir de l'en-tête de requête

    if (!userId) {
        return res.status(403).json({ status: 'error', message: getTranslation('UNAUTHORIZED_ACCESS', language, 'controllers', 'markerController') });
    }

    try {

        // Vérifier si l'utilisateur connecté est un follower accepté de l'utilisateur cible
        const [followerRows] = await connection.query<RowDataPacket[]>(
            `SELECT status FROM followers WHERE user_id = ? AND follower_id = ? AND status = 'accepted'`,
            [userProfileId, userId]
        );

        const isFollower = followerRows.length > 0;

        // Récupérer les marqueurs publics et les marqueurs de type "friends" si l'utilisateur est un follower accepté
        const [markers] = await connection.query<RowDataPacket[]>(
            `SELECT m.id, m.user_id, m.title, m.description, m.latitude, m.longitude, 
                    m.type, m.visibility, 
                    IFNULL(
                        (SELECT JSON_ARRAYAGG(JSON_OBJECT('url', mi.image_url)) 
                         FROM MarkerImages mi 
                         WHERE mi.marker_id = m.id),
                        JSON_ARRAY()
                    ) as images,
                    (SELECT COUNT(*) FROM MarkerComments mc WHERE mc.marker_id = m.id) as comments_count,
                    (SELECT IFNULL(AVG(mr.rating), 0) FROM MarkerRatings mr WHERE mr.marker_id = m.id) as average_rating,
                    (SELECT IFNULL(AVG(mc.rating), 0) FROM MarkerComments mc WHERE mc.marker_id = m.id) as average_comment_rating
                FROM Markers m
                WHERE m.user_id = ?
                AND (m.visibility = 'public' OR (m.visibility = 'friends' AND ?))
                GROUP BY m.id`,
            [userProfileId, isFollower]
        );

        // Formater les marqueurs pour assurer une structure JSON correcte
        const formattedMarkers = markers.map(marker => ({
            ...marker,
            images: JSON.parse(marker.images),
            comments_count: Number(marker.comments_count),
            average_rating: Number(marker.average_rating),
            average_comment_rating: Number(marker.average_comment_rating),
        }));

        connection.release();

        res.status(200).json({ status: 'success', data: formattedMarkers });
    } catch (err) {
        connection.release();
        console.error('Error fetching markers:', err);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'markerController') });
    }
};

export const getMarkersById = async (req: Request, res: Response) => {
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
