import { Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
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
export const getAllUsersAdmin = async (req: Request, res: Response): Promise<void> => {
    const { page = 1, size = DEFAULT_PAGE_SIZE, search = '', sortColumn = 'joined_at', sortOrder = 'DESC' } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(size as string, 10);
    const offset = (pageNumber - 1) * pageSize;
    const searchTerm = `%${search}%`; // Format pour utiliser le LIKE en SQL

    // Assurer que les paramètres de tri soient valides
    const validSortColumns = ['id', 'username', 'email', 'role', 'profile_image_url', 'gender', 'joined_at', 'last_login', 'updated_at'];
    const validSortOrders = ['ASC', 'DESC'];

    const orderByColumn = validSortColumns.includes(sortColumn as string) ? sortColumn : 'joined_at';
    const orderByDirection = validSortOrders.includes(sortOrder as string) ? sortOrder : 'DESC';

    try {
        const connection = await pool.getConnection();

        // Requête principale avec le filtre de recherche et le tri
        const [users] = await connection.query<RowDataPacket[]>(
            `SELECT id, username, email, role, profile_image_url, gender, joined_at, last_login, updated_at 
            FROM users
            WHERE username LIKE ? OR email LIKE ?
            ORDER BY ${orderByColumn} ${orderByDirection}
            LIMIT ? OFFSET ?`,
            [searchTerm, searchTerm, pageSize, offset]
        );

        // Requête pour obtenir le nombre total d'utilisateurs correspondant à la recherche
        const [totalUsers] = await connection.query<RowDataPacket[]>(
            `SELECT COUNT(*) AS total 
            FROM users
            WHERE username LIKE ? OR email LIKE ?`,
            [searchTerm, searchTerm]
        );

        connection.release();

        const total = totalUsers[0].total;
        const totalPages = Math.ceil(total / pageSize);

        res.json({
            users,
            meta: {
                totalUsers: total,
                totalPages,
                currentPage: pageNumber,
                pageSize,
            },
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};



// Contrôleur pour récupérer un utilisateur par ID
export const getUserByIdAdmin = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        const connection = await pool.getConnection();
        const [user] = await connection.query<RowDataPacket[]>(
            `SELECT id, username, email, role, profile_image_url, gender, joined_at, last_login, updated_at 
            FROM users 
            WHERE id = ?`, 
            [id]
        );

        connection.release();

        if (user.length === 0) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.json(user[0]);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Contrôleur pour mettre à jour le rôle d'un utilisateur
export const updateUserRoleAdmin = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'user', 'moderator'].includes(role)) {
        res.status(400).json({ message: 'Invalid role' });
        return;
    }

    try {
        const connection = await pool.getConnection();

        // Typage explicite avec `ResultSetHeader`
        const [result]: [ResultSetHeader, any] = await connection.query(
            `UPDATE users SET role = ? WHERE id = ?`, 
            [role, id]
        );

        connection.release();

        if (result.affectedRows === 0) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.json({ message: 'User role updated successfully' });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Contrôleur pour bloquer/débloquer un utilisateur
export const updateUserBlockedStatusAdmin = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { blocked } = req.body;

    if (typeof blocked !== 'boolean') {
        res.status(400).json({ message: 'Invalid blocked status' });
        return;
    }

    try {
        const connection = await pool.getConnection();

        // Typage explicite avec `ResultSetHeader`
        const [result]: [ResultSetHeader, any] = await connection.query(
            `UPDATE users SET blocked = ? WHERE id = ?`, 
            [blocked, id]
        );

        connection.release();

        if (result.affectedRows === 0) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.json({ message: `User ${blocked ? 'blocked' : 'unblocked'} successfully` });
    } catch (error) {
        console.error('Error updating user block status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Contrôleur pour supprimer un utilisateur
export const deleteUserAdmin = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        const connection = await pool.getConnection();

        // Vérifier si l'utilisateur existe et récupérer son rôle
        const [user]: [RowDataPacket[], any] = await connection.query(
            `SELECT role FROM users WHERE id = ?`, 
            [id]
        );

        if (user.length === 0) {
            connection.release();
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Si l'utilisateur est un admin, empêcher la suppression
        if (user[0].role === 'admin') {
            connection.release();
            res.status(403).json({ message: 'Cannot delete an admin user' });
            return;
        }

        const [images] = await connection.query<RowDataPacket[]>(
            `SELECT id, image_url FROM MarkerImages WHERE user_id = ?`,
            [id]
        );

        console.log('images', images);
        
        // Delete images from Cloudinary
        for (const image of images) {
            const publicId = image.image_url.split('/').pop()?.split('.')[0];
            if (publicId) {
                await cloudinary.v2.uploader.destroy(`mapPoint/markers/${publicId}`);
            }
        }

        // Supprimer l'utilisateur si ce n'est pas un admin
        const [result]: [ResultSetHeader, any] = await connection.query(
            `DELETE FROM users WHERE id = ?`, 
            [id]
        );

        connection.release();

        if (result.affectedRows === 0) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
