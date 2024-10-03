import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../utils/config/dbConnection';
import cloudinary from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();


cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const DEFAULT_PAGE_SIZE = 10;

// Contrôleur pour récupérer tous les utilisateurs avec pagination
export const getAllMarkersPaginationAdmin = async (req: Request, res: Response): Promise<void> => {
    const { page = 1, size = DEFAULT_PAGE_SIZE, search = '', sortColumn = 'created_at', sortOrder = 'DESC', visibility = 'all', type: markerTypes } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(size as string, 10);
    const offset = (pageNumber - 1) * pageSize;
    const searchTerm = `%${search}%`;

    // Assurer que les paramètres de tri soient valides
    const validSortColumns = ['id', 'user_id', 'title', , 'description', 'type', 'blocked', 'latitude', 'longitude', 'visibility', 'created_at'];
    const validSortOrders = ['ASC', 'DESC'];

    const orderByColumn = validSortColumns.includes(sortColumn as string) ? sortColumn : 'created_at';
    const orderByDirection = validSortOrders.includes(sortOrder as string) ? sortOrder : 'DESC';

    try {
        const connection = await pool.getConnection();
        try {
            const userRole = req.user?.role;
            if (!userRole || userRole !== 'admin') {
                res.status(403).json({ status: 'error', message: 'Unauthorized access' });
                return;
            }

            // Construction de la requête principale avec la recherche, la visibilité et le type de marker
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
                WHERE (m.title LIKE ? OR m.description LIKE ?)
            `;
            let params: (string | number)[] = [searchTerm, searchTerm];

            // Filtrer par visibilité
            switch (visibility) {
                case 'private':
                case 'friends':
                case 'public':
                    query += ` AND m.visibility = ?`;
                    params.push(visibility);
                    break;
                case 'all':
                    query += ` AND m.visibility IN ('public', 'friends', 'private')`;
                    break;
                default:
                    res.status(400).json({ status: 'error', message: 'Invalid visibility parameter' });
                    return;
            }

            // Filtrer par type de marker si fourni
            if (markerTypes) {
                const typesArray: string[] = Array.isArray(markerTypes) ? markerTypes.map(String) : [String(markerTypes)];
                const placeholders = typesArray.map(() => '?').join(', ');
                query += ` AND m.type IN (${placeholders})`;
                params.push(...typesArray);
            }

            // Ajout du tri et pagination
            query += ` GROUP BY m.id ORDER BY m.${orderByColumn} ${orderByDirection} LIMIT ? OFFSET ?`;  // Modifier ici
            params.push(pageSize, offset);

            // Exécution de la requête
            const [markers] = await connection.query<RowDataPacket[]>(query, params);

            // Requête pour obtenir le nombre total de markers correspondant à la recherche
            const [totalMarkers] = await connection.query<RowDataPacket[]>(
                `SELECT COUNT(*) AS total 
                 FROM Markers m
                 WHERE (m.title LIKE ? OR m.description LIKE ?)`,
                [searchTerm, searchTerm]
            );

            const total = totalMarkers[0].total;
            const totalPages = Math.ceil(total / pageSize);

            // Récupération des ratings pour chaque marker
            for (const marker of markers) {
                const [ratings] = await connection.query<RowDataPacket[]>(
                    `SELECT rl.label, mr.rating 
                     FROM MarkerRatings mr
                     JOIN RatingLabels rl ON mr.label_id = rl.id
                     WHERE mr.marker_id = ?`,
                    [marker.id]
                );
                marker.ratings = ratings; // Attache les ratings au marker
            }

            const formattedMarkers = markers.map(marker => ({
                ...marker,
                images: JSON.parse(marker.images), // Parse les images
            }));

            connection.release();

            // Réponse avec les markers et les meta-informations de pagination
            res.status(200).json({
                status: 'success',
                data: formattedMarkers,
                meta: {
                    totalMarkers: total,
                    totalPages,
                    currentPage: pageNumber,
                    pageSize,
                },
            });
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


export const deleteMarkerAdmin = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        const connection = await pool.getConnection();

        const [images] = await connection.query<RowDataPacket[]>(
            `SELECT id, image_url FROM MarkerImages WHERE marker_id = ?`,
            [id]
        );

        console.log('images', images);

        for (const image of images) {
            const publicId = image.image_url.split('/').pop()?.split('.')[0];
            if (publicId) {
                await cloudinary.v2.uploader.destroy(`mapPoint/markers/${publicId}`);
            }
        }

        const [result]: [ResultSetHeader, any] = await connection.query(
            `DELETE FROM Markers WHERE id = ?`,
            [id]
        );

        connection.release();

        if (result.affectedRows === 0) {
            res.status(404).json({ message: 'Marker not found' });
            return;
        }

        res.json({ message: 'Marker deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteMultipleMarkersAdmin = async (req: Request, res: Response): Promise<void> => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ message: 'Invalid or empty IDs array' });
        return;
    }

    try {
        const connection = await pool.getConnection();

        // Récupérer les images associées aux markers à supprimer
        const [images] = await connection.query<RowDataPacket[]>(
            `SELECT id, image_url FROM MarkerImages WHERE marker_id IN (?)`,
            [ids]
        );

        // Supprimer les images de Cloudinary pour chaque marker
        for (const image of images) {
            const publicId = image.image_url.split('/').pop()?.split('.')[0];
            if (publicId) {
                await cloudinary.v2.uploader.destroy(`mapPoint/markers/${publicId}`);
            }
        }

        // Supprimer les markers
        const [result]: [ResultSetHeader, any] = await connection.query(
            `DELETE FROM Markers WHERE id IN (?)`,
            [ids]
        );

        connection.release();

        if (result.affectedRows === 0) {
            res.status(404).json({ message: 'No markers were deleted, they may not exist.' });
            return;
        }

        res.json({ message: `${result.affectedRows} markers deleted successfully` });
    } catch (error) {
        console.error('Error deleting markers:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
