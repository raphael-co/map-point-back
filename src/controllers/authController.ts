import { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { RowDataPacket } from 'mysql2';
import pool from '../utils/config/dbConnection';
import dotenv from 'dotenv';

dotenv.config();

const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY) {
    throw new Error("SECRET_KEY is not defined in the environment variables");
}

export const registerController = async (req: Request, res: Response) => {
    const { username, emailAddresses, password, gender } = req.body;

    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM users WHERE email = ?', [emailAddresses]);
        if (rows.length > 0) {
            connection.release();
            return res.status(400).json({ status: 'error', message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await connection.query('INSERT INTO users (username, email, password, gender) VALUES (?, ?, ?, ?)', [username, emailAddresses, hashedPassword, gender]);
        connection.release();
        res.status(201).json({ status: 'success', message: 'User registered successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

export const loginController = async (req: Request, res: Response) => {
    const { emailAddresses, password } = req.body;

    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM users WHERE email = ?', [emailAddresses]);
        connection.release();
        if (rows.length === 0) {
            return res.status(400).json({ status: 'error', message: 'Invalid credentials' });
        }

        const user = rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ status: 'error', message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });
        res.status(200).json({ status: 'success', token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
