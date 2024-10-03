import { Request, Response } from 'express';
import pool from '../utils/config/dbConnection';
import { RowDataPacket } from 'mysql2';
import getTranslation from '../utils/translate'; // Fonction de traduction

// Ajouter une documentation
export const addDocumentation = async (req: Request, res: Response) => {
    const { title } = req.body;
    const language = 'en';
    const author_id = req.user?.id;

    try {
        const connection = await pool.getConnection();

        if (!req.file) {
            return res.status(400).json({ message: getTranslation('FILE_MISSING', language, 'controllers', 'documentationController') });
        }

        // Stocker le fichier Markdown en tant que BLOB
        const fileBuffer = req.file.buffer; 

        await connection.query(
            'INSERT INTO documentation (title, content, author_id) VALUES (?, ?, ?)',
            [title, fileBuffer, author_id]
        );

        connection.release();

        res.status(201).json({ message: getTranslation('DOCUMENTATION_ADDED_SUCCESS', language, 'controllers', 'documentationController') });
    } catch (error) {
        console.error('Error adding documentation:', error);
        res.status(500).json({ message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'documentationController') });
    }
};

// Récupérer toutes les documentations
export const getDocumentations = async (req: Request, res: Response) => {
    const language = req.headers['accept-language'] || 'en';

    try {
        const connection = await pool.getConnection();
        const [documentations] = await connection.query<RowDataPacket[]>(
            'SELECT id, title, created_at FROM documentation ORDER BY created_at DESC'
        );
        connection.release();

        res.status(200).json(documentations);
    } catch (error) {
        console.error('Error fetching documentations:', error);
        res.status(500).json({ message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'documentationController') });
    }
};

// Mettre à jour une documentation
export const updateDocumentation = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title } = req.body;
    const language = req.headers['accept-language'] || 'en';

    try {
        const connection = await pool.getConnection();

        let fileBuffer;
        if (req.file) {
            fileBuffer = req.file.buffer;
        } else {
            const [existingContentRows] = await connection.query<RowDataPacket[]>(
                'SELECT content FROM documentation WHERE id = ?',
                [id]
            );
            fileBuffer = existingContentRows[0].content;
        }

        await connection.query(
            'UPDATE documentation SET title = ?, content = ? WHERE id = ?',
            [title, fileBuffer, id]
        );

        connection.release();

        res.status(200).json({ message: getTranslation('DOCUMENTATION_UPDATED_SUCCESS', language, 'controllers', 'documentationController') });
    } catch (error) {
        console.error('Error updating documentation:', error);
        res.status(500).json({ message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'documentationController') });
    }
};

// Supprimer une documentation
export const deleteDocumentation = async (req: Request, res: Response) => {
    const { id } = req.params;
    const authorId = req.user?.id;
    const language = req.headers['accept-language'] || 'en';

    try {
        const connection = await pool.getConnection();

        const [rows] = await connection.query<RowDataPacket[]>(
            'SELECT author_id FROM documentation WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            connection.release();
            return res.status(404).json({ message: getTranslation('DOCUMENTATION_NOT_FOUND', language, 'controllers', 'documentationController') });
        }

        if (rows[0].author_id !== authorId) {
            connection.release();
            return res.status(403).json({ message: getTranslation('UNAUTHORIZED', language, 'controllers', 'documentationController') });
        }

        await connection.query(
            'DELETE FROM documentation WHERE id = ?',
            [id]
        );
        connection.release();

        res.status(200).json({ message: getTranslation('DOCUMENTATION_DELETED_SUCCESS', language, 'controllers', 'documentationController') });
    } catch (error) {
        console.error('Error deleting documentation:', error);
        res.status(500).json({ message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'documentationController') });
    }
};

// Supprimer plusieurs documentations
export const deleteDocumentations = async (req: Request, res: Response) => {
    const { ids } = req.body;
    const authorId = req.user?.id;
    const language = req.headers['accept-language'] || 'en';

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: getTranslation('INVALID_IDS', language, 'controllers', 'documentationController') });
    }

    try {
        const connection = await pool.getConnection();

        const [rows] = await connection.query<RowDataPacket[]>(
            'SELECT id, author_id FROM documentation WHERE id IN (?)',
            [ids]
        );

        if (rows.length !== ids.length) {
            connection.release();
            return res.status(404).json({ message: getTranslation('SOME_DOCUMENTATIONS_NOT_FOUND', language, 'controllers', 'documentationController') });
        }

        const unauthorizedIds = rows.filter(row => row.author_id !== authorId).map(row => row.id);
        if (unauthorizedIds.length > 0) {
            connection.release();
            return res.status(403).json({ message: getTranslation('UNAUTHORIZED_DOCUMENTATIONS', language, 'controllers', 'documentationController'), unauthorizedIds });
        }

        await connection.query('DELETE FROM documentation WHERE id IN (?)', [ids]);

        connection.release();
        res.status(200).json({ message: getTranslation('DOCUMENTATIONS_DELETED_SUCCESS', language, 'controllers', 'documentationController') });
    } catch (error) {
        console.error('Error deleting documentations:', error);
        res.status(500).json({ message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'documentationController') });
    }
};

// Récupérer une documentation par ID
export const getDocumentationById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const language = req.headers['accept-language'] || 'en';

    try {
        const connection = await pool.getConnection();
        const [documentation] = await connection.query<RowDataPacket[]>(
            'SELECT * FROM documentation WHERE id = ?', [id]
        );
        connection.release();

        if (documentation.length === 0) {
            return res.status(404).json({ status: 'error', message: getTranslation('', language, 'controllers', 'documentationController') });
        }

        res.status(200).json(documentation[0]);
    } catch (error) {
        console.error('Error fetching documentation:', error);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'documentationController') });
    }
};

export const getDocumentationByTitle = async (req: Request, res: Response) => {
    const { title } = req.params;
    const language = req.headers['accept-language'] || 'en';

    try {
        const connection = await pool.getConnection();
        const [documentation] = await connection.query<RowDataPacket[]>(
            'SELECT * FROM documentation WHERE title = ?', [title]
        );
        connection.release();

        if (documentation.length === 0) {
            return res.status(404).json({ status: 'error', message: getTranslation('', language, 'controllers', 'documentationController') });
        }

        res.status(200).json(documentation[0]);
    } catch (error) {
        console.error('Error fetching documentation:', error);
        res.status(500).json({ status: 'error', message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'documentationController') });
    }
};

// Récupérer les documentations avec pagination
export const getDocumentationsWithPagination = async (req: Request, res: Response): Promise<void> => {
    const { page = 1, size = 10, search = '', sortColumn = 'created_at', sortOrder = 'DESC' } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(size as string, 10);
    const offset = (pageNumber - 1) * pageSize;
    const searchTerm = `%${search}%`;

    const validSortColumns = ['id', 'title', 'created_at', 'author_id', 'updated_at'];
    const validSortOrders = ['ASC', 'DESC'];

    const orderByColumn = validSortColumns.includes(sortColumn as string) ? sortColumn : 'created_at';
    const orderByDirection = validSortOrders.includes(sortOrder as string) ? sortOrder : 'DESC';

    try {
        const connection = await pool.getConnection();
        try {
            let query = `
                SELECT 
                    d.id, d.title, d.author_id, d.created_at, d.updated_at,
                    d.content
                FROM documentation d
                WHERE (d.title LIKE ? OR d.content LIKE ?)
            `;
            let params: (string | number)[] = [searchTerm, searchTerm];

            query += ` ORDER BY d.${orderByColumn} ${orderByDirection} LIMIT ? OFFSET ?`;
            params.push(pageSize, offset);

            const [documentations] = await connection.query<RowDataPacket[]>(query, params);

            const [totalDocumentations] = await connection.query<RowDataPacket[]>(
                `SELECT COUNT(*) AS total 
                 FROM documentation d
                 WHERE (d.title LIKE ? OR d.content LIKE ?)`,
                [searchTerm, searchTerm]
            );

            const total = totalDocumentations[0].total;
            const totalPages = Math.ceil(total / pageSize);

            connection.release();

            res.status(200).json({
                status: 'success',
                data: documentations,
                meta: {
                    totalDocumentations: total,
                    totalPages,
                    currentPage: pageNumber,
                    pageSize,
                },
            });
        } catch (error) {
            connection.release();
            console.error('Error fetching documentations:', error);
            res.status(500).json({ status: 'error', message: 'Internal server error' });
        }
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

// Récupérer uniquement les titres des documentations
export const getDocumentationTitles = async (req: Request, res: Response) => {
    const language = req.headers['accept-language'] || 'en';

    try {
        const connection = await pool.getConnection();
        const [titles] = await connection.query<RowDataPacket[]>(
            'SELECT id, title FROM documentation ORDER BY created_at DESC'
        );
        connection.release();

        res.status(200).json(titles);
    } catch (error) {
        console.error('Error fetching documentation titles:', error);
        res.status(500).json({ message: getTranslation('INTERNAL_SERVER_ERROR', language, 'controllers', 'documentationController') });
    }
};
