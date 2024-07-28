import { Request, Response } from 'express';
import pool from '../utils/config/dbConnection';
import axios from 'axios';
import { RowDataPacket, ResultSetHeader } from 'mysql2';




// Fonction pour ajouter uniquement un token de notification push
export const addPushToken = async (req: Request, res: Response) => {
    const { token } = req.body;

    console.log(token);
    
    if (!token) {
        return res.status(400).json({ success: false, error: 'Token is required' });
    }

    console.log('ici');
    
    try {
        // Vérifier si le token existe déjà dans PushTokens
        let [rows]: [RowDataPacket[], any] = await pool.query(
            'SELECT id FROM PushTokens WHERE token = ?', [token]
        );

        if (rows.length === 0) {
            // Si le token n'existe pas, l'insérer
            const [result]: [ResultSetHeader, any] = await pool.query(
                'INSERT INTO PushTokens (token) VALUES (?)', [token]
            );
            console.log(result);
            
            return res.status(200).json({ success: true, tokenId: result.insertId });
        } else {
            return res.status(200).json({ success: false, message: 'Token already exists', tokenId: rows[0].id });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, error: 'Database error' });
    }
};

// Function to save a push notification token
export const saveToken = async (req: Request, res: Response) => {
    const { token } = req.body;
    const userId = req.user?.id;

    if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    try {
        // Check if the token already exists in PushTokens
        const [rows]: [RowDataPacket[], any] = await pool.query(
            'SELECT id FROM PushTokens WHERE token = ?', [token]
        );
        let tokenId: number;

        if (rows.length === 0) {
            // If the token doesn't exist, insert it and get its ID
            const [result]: [ResultSetHeader, any] = await pool.query(
                'INSERT INTO PushTokens (token) VALUES (?)', [token]
            );
            tokenId = result.insertId;
        } else {
            tokenId = rows[0].id;
        }

        // Check if the association between the user and the token already exists
        const [userTokenRows]: [RowDataPacket[], any] = await pool.query(
            'SELECT * FROM UserPushTokens WHERE user_id = ? AND push_token_id = ?', [userId, tokenId]
        );
        if (userTokenRows.length === 0) {
            // If the association doesn't exist, insert it
            await pool.query(
                'INSERT INTO UserPushTokens (user_id, push_token_id) VALUES (?, ?)', [userId, tokenId]
            );
        }

        res.status(200).send({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, error: 'Database error' });
    }
};

// Function to send a push notification
export const sendNotification = async (req: Request, res: Response) => {
    const { title, body } = req.body;
    const userId = req.user?.id;

    if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    try {
        // Get the user's tokens
        const [tokens]: [RowDataPacket[], any] = await pool.query(
            `SELECT pt.token 
             FROM UserPushTokens upt 
             JOIN PushTokens pt ON upt.push_token_id = pt.id 
             WHERE upt.user_id = ?`, [userId]
        );

        const messages = tokens.map(token => ({
            to: token.token.trim(),
            sound: 'default',
            title,
            body,
            data: { someData: 'goes here' },
        }));

        // Send notifications via Expo API
        const results = await Promise.all(
            messages.map(message =>
                axios.post('https://exp.host/--/api/v2/push/send', message, {
                    headers: {
                        'Accept': 'application/json',
                        'Accept-Encoding': 'gzip, deflate',
                        'Content-Type': 'application/json',
                    }
                }).then(response => response.data)
            )
        );

        res.status(200).json({ success: true, results });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Function to send notifications to multiple users
export const sendNotificationToUsers = async (req: Request, res: Response) => {
    const { title, body, targetUserIds } = req.body;

    if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
        return res.status(400).json({ success: false, error: 'Invalid target user IDs' });
    }

    try {
        // Get tokens for target users
        const [tokens]: [RowDataPacket[], any] = await pool.query(
            `SELECT DISTINCT pt.token 
             FROM UserPushTokens upt 
             JOIN PushTokens pt ON upt.push_token_id = pt.id 
             WHERE upt.user_id IN (?)`, [targetUserIds]
        );

        const uniqueTokens = Array.from(new Set(tokens.map(token => token.token.trim())));

        const messages = uniqueTokens.map(token => ({
            to: token,
            sound: 'default',
            title,
            body,
            data: { someData: 'goes here' },
        }));

        // Send notifications via Expo API
        const results = await Promise.all(
            messages.map(message =>
                axios.post('https://exp.host/--/api/v2/push/send', message, {
                    headers: {
                        'Accept': 'application/json',
                        'Accept-Encoding': 'gzip, deflate',
                        'Content-Type': 'application/json',
                    }
                }).then(response => response.data)
            )
        );

        res.status(200).json({ success: true, results });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Function to link a user with a push token
export const linkUserWithPushToken = async (req: Request, res: Response) => {
    const { token } = req.body;
    const userId = req.user?.id;
    if (!userId || !token) {
        return res.status(400).json({ success: false, error: 'User ID and token are required' });
    }

    try {
        // Check if the token already exists in PushTokens
        const [tokenRows]: [RowDataPacket[], any] = await pool.query(
            'SELECT id FROM PushTokens WHERE token = ?', [token]
        );

        let tokenId: number;
        if (tokenRows.length === 0) {
            // If the token doesn't exist, insert it and get its ID
            const [result]: [ResultSetHeader, any] = await pool.query(
                'INSERT INTO PushTokens (token) VALUES (?)', [token]
            );
            tokenId = result.insertId;
        } else {
            tokenId = tokenRows[0].id;
        }

        // Check if the association between the user and the token already exists
        const [userTokenRows]: [RowDataPacket[], any] = await pool.query(
            'SELECT * FROM UserPushTokens WHERE user_id = ? AND push_token_id = ?', [userId, tokenId]
        );

        if (userTokenRows.length === 0) {
            // If the association doesn't exist, insert it
            await pool.query(
                'INSERT INTO UserPushTokens (user_id, push_token_id) VALUES (?, ?)', [userId, tokenId]
            );
        }

        res.status(200).json({ success: true, message: 'User linked with push token successfully' });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
};