import pool from './config/dbConnection';
import { RowDataPacket } from 'mysql2';


export interface User {
    id: number;
    username: string;
    email: string;
    password?: string; // Assuming password may be excluded when sending to frontend
    profile_image_url?: string;
    gender?: 'male' | 'female' | 'other';
    joined_at: Date;
    last_login: Date;
    updated_at: Date;
    connection_type: 'mail' | 'google' | 'ios';
}
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


export const getUserById = async (userId: number): Promise<User | null> => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM users WHERE id = ?', [userId]);
        connection.release();
        if (rows.length > 0) {
            const user: User = {
                id: rows[0].id,
                username: rows[0].username,
                email: rows[0].email,
                profile_image_url: rows[0].profile_image_url,
                gender: rows[0].gender,
                joined_at: new Date(rows[0].joined_at),
                last_login: new Date(rows[0].last_login),
                updated_at: new Date(rows[0].updated_at),
                connection_type: rows[0].connection_type,
            };
            return user;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error fetching username:', error);
        throw error;
    }
};
