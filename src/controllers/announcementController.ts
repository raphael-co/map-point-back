import { Request, Response } from 'express';
import pool from '../utils/config/dbConnection';
import { RowDataPacket } from 'mysql2';
import fs from 'fs/promises';
import getTranslation from '../utils/translate';  // Fonction de traduction

// Ajouter une annonce

export const addAnnouncement = async (req: Request, res: Response) => {
    const { title } = req.body;
    const language =  'en';
    const author_id = req.user?.id;
    try {
        const connection = await pool.getConnection();

        if (!req.file) {
            return res.status(400).json({ message: getTranslation('FILE_MISSING', language, 'controllers', 'announcementController') });
        }
        // Stocker le fichier Markdown en tant que BLOB
        const fileBuffer = req.file.buffer; 

        console.log(`File buffer: ${fileBuffer}`);
        
        await connection.query(
            'INSERT INTO announcements (title, content, author_id) VALUES (?, ?, ?)',
            [title, fileBuffer, author_id]
        );

        connection.release();

        res.status(201).json({ message: getTranslation('ANNOUNCEMENT_ADDED_SUCCESS', language, 'controllers', 'announcementController') });
    } catch (error) {
        console.error('Error adding announcement:', error);
        res.status(500).json({ message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'announcementController') });
    }
};

// Récupérer toutes les annonces
export const getAnnouncements = async (req: Request, res: Response) => {
    const language = req.headers['accept-language'] || 'en';

    try {
        const connection = await pool.getConnection();
        const [announcements] = await connection.query<RowDataPacket[]>(
            'SELECT id,title,created_at FROM announcements ORDER BY created_at DESC'
        );
        connection.release();

        res.status(200).json(announcements);
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'announcementController') });
    }
};

// Mettre à jour une annonce
export const updateAnnouncement = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title } = req.body;
    const language = req.headers['accept-language'] || 'en';

    try {
        const connection = await pool.getConnection();

        // Vérifier si un fichier est envoyé
        let fileBuffer;
        if (req.file) {
            fileBuffer = req.file.buffer; // Si un fichier est envoyé, on récupère son buffer
        } else {
            // Récupérer l'ancien contenu de la base de données si aucun fichier n'est envoyé
            const [existingContentRows] = await connection.query<RowDataPacket[]>(
                'SELECT content FROM announcements WHERE id = ?',
                [id]
            );
            fileBuffer = existingContentRows[0].content; // Utiliser le contenu existant
        }

        // Mettre à jour le titre et le contenu
        await connection.query(
            'UPDATE announcements SET title = ?, content = ? WHERE id = ?',
            [title, fileBuffer, id]
        );

        connection.release();

        res.status(200).json({ message: getTranslation('ANNOUNCEMENT_UPDATED_SUCCESS', language, 'controllers', 'announcementController') });
    } catch (error) {
        console.error('Error updating announcement:', error);
        res.status(500).json({ message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'announcementController') });
    }
};


// Supprimer une annonce
export const deleteAnnouncement = async (req: Request, res: Response) => {
    const { id } = req.params;
    const authorId = req.user?.id;
    const language = req.headers['accept-language'] || 'en';

    try {
        const connection = await pool.getConnection();

        const [rows] = await connection.query<RowDataPacket[]>(
            'SELECT author_id FROM announcements WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            connection.release();
            return res.status(404).json({ message: getTranslation('ANNOUNCEMENT_NOT_FOUND', language, 'controllers', 'announcementController') });
        }

        if (rows[0].author_id !== authorId) {
            connection.release();
            return res.status(403).json({ message: getTranslation('UNAUTHORIZED', language, 'controllers', 'announcementController') });
        }

        await connection.query(
            'DELETE FROM announcements WHERE id = ?',
            [id]
        );
        connection.release();

        res.status(200).json({ message: getTranslation('ANNOUNCEMENT_DELETED_SUCCESS', language, 'controllers', 'announcementController') });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({ message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'announcementController') });
    }
};

export const getAnnouncementById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const language = req.headers['accept-language'] || 'en';  // Déterminer la langue à partir de l'en-tête de requête

    try {
        const connection = await pool.getConnection();
        const [announcement] = await connection.query<RowDataPacket[]>(
            'SELECT * FROM announcements WHERE id = ?',            [id]
        );
        connection.release();

        if (announcement.length === 0) {
            return res.status(404).json({ status: 'error', message: getTranslation('ANNOUNCEMENT_NOT_FOUND', language, 'controllers', 'announcementController') });
        }

        res.status(200).json(announcement[0]);  // Retourne l'annonce si trouvée
    } catch (error) {
        console.error('Error fetching announcement:', error);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'announcementController') });
    }
};