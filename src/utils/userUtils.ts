import pool from './config/dbConnection';
import { RowDataPacket } from 'mysql2';

export const getUsernameById = async (userId: number): Promise<string | null> => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query<RowDataPacket[]>('SELECT username FROM users WHERE id = ?', [userId]);
        connection.release();
        if (rows.length > 0) {
            return rows[0].username;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error fetching username:', error);
        throw error;
    }
};
