import { Request, Response } from 'express';
import pool from '../utils/config/dbConnection';
import { RowDataPacket } from 'mysql2';
import fs from 'fs/promises';
import getTranslation from '../utils/translate';  // Fonction de traduction




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
