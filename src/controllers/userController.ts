import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../utils/config/dbConnection';

export const getUserAuth = async (req: Request, res: Response) => {
    const userId = req.user;

    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query<RowDataPacket[]>('SELECT id, username, email, gender FROM users WHERE id = ?', [userId]);
        connection.release();

        if (rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        const user = rows[0];
        res.status(200).json({ status: 'success', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query<RowDataPacket[]>('SELECT id, username, email, gender FROM users');
        connection.release();

        if (rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'No users found' });
        }

        res.status(200).json({ status: 'success', users: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};


export const getAllUsersExceptCurrent = async (req: Request, res: Response) => {
    try {
        const userId = req.user;
        const connection = await pool.getConnection();
        const [rows] = await connection.query<RowDataPacket[]>('SELECT id, username, email, gender FROM users WHERE id != ?', [userId]);
        connection.release();

        if (rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'No users found' });
        }

        res.status(200).json({ status: 'success', users: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};