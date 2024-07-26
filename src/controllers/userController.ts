import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../utils/config/dbConnection';

export const getUserAuth = async (req: Request, res: Response) => {
    const userId = req.user?.id;

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
        // Assurez-vous que req.user est typé correctement
        const userId = req.user!.id;
        const { username, email, gender, page = 1, limit = 10 } = req.query;

        const offset = (Number(page) - 1) * Number(limit);

        let query = 'SELECT id, username, email, gender FROM users WHERE id != ?';
        let queryParams: (string | number)[] = [userId];

        // Vérifiez les types et castings des paramètres de requête
        if (typeof username === 'string') {
            query += ' AND username LIKE ?';
            queryParams.push(`%${username}%`);
        }

        if (typeof email === 'string') {
            query += ' AND email LIKE ?';
            queryParams.push(`%${email}%`);
        }

        if (typeof gender === 'string') {
            query += ' AND gender = ?';
            queryParams.push(gender);
        }

        query += ' LIMIT ? OFFSET ?';
        queryParams.push(Number(limit), offset);

        const connection = await pool.getConnection();
        const [rows] = await connection.query<RowDataPacket[]>(query, queryParams);
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