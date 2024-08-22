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
            res.status(500).json({ status: 'error', message: 'Internal server error' });
        }
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};



export const getAllMarkersUserConnect = async (req: Request, res: Response) => {
    const connection = await pool.getConnection();
    try {
        const userId = req.user?.id ?? null;

        if (!userId) {
            return res.status(403).json({ status: 'error', message: 'Unauthorized access' });
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
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

export const getMarkersByUser = async (req: Request, res: Response) => {
    const connection = await pool.getConnection();
    try {
        const currentUserId = req.user?.id ?? null;
        const targetUserId = parseInt(req.params.userId, 10);

        if (!currentUserId) {
            return res.status(403).json({ status: 'error', message: 'Unauthorized access' });
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
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

// Update marker function
export const updateMarker = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, description, latitude, longitude, type, ratings, comment, visibility } = req.body;
    const files = req.files as Express.Multer.File[] | undefined;
    const userId = req.user?.id;

    if (!id || !userId) {
        return res.status(400).json({ status: 'error', message: 'Marker ID and user ID are required.' });
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
            return res.status(404).json({ status: 'error', message: 'Marker not found or unauthorized access.' });
        }

        // Update the marker's details
        await connection.query(
            `UPDATE Markers SET title = ?, description = ?, latitude = ?, longitude = ?, type = ?, visibility = ?, comment = ? WHERE id = ?`,
            [title, description, latitude, longitude, type, visibility, comment, id]
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
        io.emit('markersUpdated');
        res.status(200).json({ status: 'success', message: 'Marker updated successfully' });
    } catch (error) {
        console.error('Error updating marker:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};


export const getAllMarkersUserProfile = async (req: Request, res: Response) => {
    const { userProfileId } = req.params; // ID du profil utilisateur ciblé
    const userId = req.user?.id; // ID de l'utilisateur connecté
    const connection = await pool.getConnection();

    if (!userId) {
        return res.status(403).json({ status: 'error', message: 'Unauthorized access' });
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
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};


export const getMarkersById = async (req: Request, res: Response) => {
    const { id } = req.params;

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
                return res.status(404).json({ status: 'error', message: 'Marker not found' });
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
            res.status(500).json({ status: 'error', message: 'Internal server error' });
        }
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
}