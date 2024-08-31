import { Request, Response } from 'express';
import pool from '../utils/config/dbConnection';
import axios from 'axios';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import getTranslation from '../utils/translate'; // Importer la fonction de traduction

// Fonction pour ajouter uniquement un token de notification push
export const addPushToken = async (req: Request, res: Response) => {
    const { token } = req.body;
    const language = 'fr'; // Déterminer la langue à partir de l'en-tête de requête

    console.log(`addPushToken called with token: ${token}`);

    if (!token) {
        console.log('Token is missing');
        return res.status(400).json({ success: false, error: getTranslation('TOKEN_REQUIRED', language, 'controllers', 'pushController') });
    }

    try {
        // Vérifier si le token existe déjà dans PushTokens
        let [rows]: [RowDataPacket[], any] = await pool.query(
            'SELECT id FROM PushTokens WHERE token = ?', [token]
        );

        console.log(`Token check result: ${JSON.stringify(rows)}`);

        if (rows.length === 0) {
            // Si le token n'existe pas, l'insérer
            const [result]: [ResultSetHeader, any] = await pool.query(
                'INSERT INTO PushTokens (token) VALUES (?)', [token]
            );
            console.log(`Token inserted with ID: ${result.insertId}`);
            return res.status(200).json({ success: true, tokenId: result.insertId });
        } else {
            console.log('Token already exists');
            return res.status(200).json({ success: false, message: getTranslation('TOKEN_ALREADY_EXISTS', language, 'controllers', 'pushController'), tokenId: rows[0].id });
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).send({ success: false, error: getTranslation('DATABASE_ERROR', language, 'controllers', 'pushController') });
    }
};

// Function to save a push notification token
export const saveToken = async (req: Request, res: Response) => {
    const { token } = req.body;
    const userId = req.user?.id;
    const language = 'fr' // Déterminer la langue à partir de l'en-tête de requête

    console.log(`saveToken called with token: ${token} and userId: ${userId}`);

    if (!userId) {
        console.log('User ID is missing');
        return res.status(400).json({ success: false, error: getTranslation('USER_ID_REQUIRED', language, 'controllers', 'pushController') });
    }

    try {
        // Check if the token already exists in PushTokens
        const [rows]: [RowDataPacket[], any] = await pool.query(
            'SELECT id FROM PushTokens WHERE token = ?', [token]
        );
        console.log(`Token check result: ${JSON.stringify(rows)}`);
        let tokenId: number;

        if (rows.length === 0) {
            // If the token doesn't exist, insert it and get its ID
            const [result]: [ResultSetHeader, any] = await pool.query(
                'INSERT INTO PushTokens (token) VALUES (?)', [token]
            );
            tokenId = result.insertId;
            console.log(`Token inserted with ID: ${tokenId}`);
        } else {
            tokenId = rows[0].id;
            console.log(`Token already exists with ID: ${tokenId}`);
        }

        // Check if the association between the user and the token already exists
        const [userTokenRows]: [RowDataPacket[], any] = await pool.query(
            'SELECT * FROM UserPushTokens WHERE user_id = ? AND push_token_id = ?', [userId, tokenId]
        );
        console.log(`User-token association check result: ${JSON.stringify(userTokenRows)}`);
        if (userTokenRows.length === 0) {
            // If the association doesn't exist, insert it
            await pool.query(
                'INSERT INTO UserPushTokens (user_id, push_token_id) VALUES (?, ?)', [userId, tokenId]
            );
            console.log('User-token association inserted');
        }

        res.status(200).send({ success: true });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).send({ success: false, error: getTranslation('DATABASE_ERROR', language, 'controllers', 'pushController') });
    }
};

// Function to send a push notification
export const sendNotification = async (req: Request, res: Response) => {
    const { title, body } = req.body;
    const userId = 1; // This should ideally come from req.user
    const language = 'fr'; // Déterminer la langue à partir de l'en-tête de requête

    console.log(`sendNotification called with title: ${title}, body: ${body}, userId: ${userId}`);

    if (!userId) {
        console.log('User ID is missing');
        return res.status(400).json({ success: false, error: getTranslation('USER_ID_REQUIRED', language, 'controllers', 'pushController') });
    }

    try {
        // Get the user's tokens
        const [tokens]: [RowDataPacket[], any] = await pool.query(
            `SELECT pt.token 
             FROM UserPushTokens upt 
             JOIN PushTokens pt ON upt.push_token_id = pt.id 
             WHERE upt.user_id = ?`, [userId]
        );

        console.log(`Tokens retrieved: ${JSON.stringify(tokens)}`);
        
        const messages = tokens.map(token => ({
            to: token.token.trim(),
            sound: 'default',
            title,
            body,
            data: { someData: 'goes here' },
        }));

        console.log(`Messages to send: ${JSON.stringify(messages)}`);

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

        console.log(`Notification send results: ${JSON.stringify(results)}`);

        res.status(200).json({ success: true, results });
    } catch (error: any) {
        console.error('Error sending notification:', error);
        res.status(500).json({ success: false, error: getTranslation('NOTIFICATION_SEND_ERROR', language, 'controllers', 'pushController') });
    }
};

// Function to send notifications to multiple users
export const sendNotificationToUsers = async (req: Request, res: Response) => {
    const { title, body, targetUserIds } = req.body;
    const language = 'fr'; // Déterminer la langue à partir de l'en-tête de requête

    console.log(`sendNotificationToUsers called with title: ${title}, body: ${body}, targetUserIds: ${targetUserIds}`);

    if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
        console.log('Invalid target user IDs');
        return res.status(400).json({ success: false, error: getTranslation('INVALID_TARGET_USER_IDS', language, 'controllers', 'pushController') });
    }

    try {
        // Get tokens for target users
        const [tokens]: [RowDataPacket[], any] = await pool.query(
            `SELECT DISTINCT pt.token 
             FROM UserPushTokens upt 
             JOIN PushTokens pt ON upt.push_token_id = pt.id 
             WHERE upt.user_id IN (?)`, [targetUserIds]
        );

        console.log(`Tokens retrieved for users: ${JSON.stringify(tokens)}`);

        const uniqueTokens = Array.from(new Set(tokens.map(token => token.token.trim())));

        const messages = uniqueTokens.map(token => ({
            to: token,
            sound: 'default',
            title,
            body,
            data: { someData: 'goes here' },
        }));

        console.log(`Messages to send: ${JSON.stringify(messages)}`);

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

        console.log(`Notification send results: ${JSON.stringify(results)}`);

        res.status(200).json({ success: true, results });
    } catch (error: any) {
        console.error('Error sending notifications:', error);
        res.status(500).json({ success: false, error: getTranslation('NOTIFICATION_SEND_ERROR', language, 'controllers', 'pushController') });
    }
};

// Function to link a user with a push token
export const linkUserWithPushToken = async (req: Request, res: Response) => {
    const { token } = req.body;
    const userId = req.user?.id;
    const language = 'fr'; // Déterminer la langue à partir de l'en-tête de requête

    console.log(`linkUserWithPushToken called with token: ${token} and userId: ${userId}`);

    if (!userId || !token) {
        console.log('User ID or token is missing');
        return res.status(400).json({ success: false, error: getTranslation('USER_ID_AND_TOKEN_REQUIRED', language, 'controllers', 'pushController') });
    }

    try {
        // Check if the token already exists in PushTokens
        const [tokenRows]: [RowDataPacket[], any] = await pool.query(
            'SELECT id FROM PushTokens WHERE token = ?', [token]
        );

        console.log(`Token check result: ${JSON.stringify(tokenRows)}`);

        let tokenId: number;
        if (tokenRows.length === 0) {
            // If the token doesn't exist, insert it and get its ID
            const [result]: [ResultSetHeader, any] = await pool.query(
                'INSERT INTO PushTokens (token) VALUES (?)', [token]
            );
            tokenId = result.insertId;
            console.log(`Token inserted with ID: ${tokenId}`);
        } else {
            tokenId = tokenRows[0].id;
            console.log(`Token already exists with ID: ${tokenId}`);
        }

        // Check if the association between the user and the token already exists
        const [userTokenRows]: [RowDataPacket[], any] = await pool.query(
            'SELECT * FROM UserPushTokens WHERE user_id = ? AND push_token_id = ?', [userId, tokenId]
        );

        console.log(`User-token association check result: ${JSON.stringify(userTokenRows)}`);

        if (userTokenRows.length === 0) {
            // If the association doesn't exist, insert it
            await pool.query(
                'INSERT INTO UserPushTokens (user_id, push_token_id) VALUES (?, ?)', [userId, tokenId]
            );
            console.log('User-token association inserted');
        }

        res.status(200).json({ success: true, message: getTranslation('USER_LINKED_WITH_TOKEN_SUCCESS', language, 'controllers', 'pushController') });
    } catch (error: any) {
        console.error('Database error:', error);
        res.status(500).json({ success: false, error: getTranslation('DATABASE_ERROR', language, 'controllers', 'pushController') });
    }
};

export const unlinkUserWithPushToken = async (req: Request, res: Response) => {
    const { token } = req.body;
    const userId = req.user?.id;
    const language = 'fr'; // Déterminer la langue à partir de l'en-tête de requête

    console.log(`unlinkUserWithPushToken called with token: ${token} and userId: ${userId}`);

    if (!userId || !token) {
        console.log('User ID or token is missing');
        return res.status(400).json({ success: false, error: getTranslation('USER_ID_AND_TOKEN_REQUIRED', language, 'controllers', 'pushController') });
    }

    try {
        // Check if the token exists in PushTokens
        const [tokenRows]: [RowDataPacket[], any] = await pool.query(
            'SELECT id FROM PushTokens WHERE token = ?', [token]
        );

        console.log(`Token check result: ${JSON.stringify(tokenRows)}`);

        if (tokenRows.length === 0) {
            console.log('Token not found');
            return res.status(404).json({ success: false, error: getTranslation('TOKEN_NOT_FOUND', language, 'controllers', 'pushController') });
        }

        const tokenId = tokenRows[0].id;

        // Remove the association between the user and the token
        const [result]: [ResultSetHeader, any] = await pool.query(
            'DELETE FROM UserPushTokens WHERE user_id = ? AND push_token_id = ?', [userId, tokenId]
        );

        console.log(`Unlink result: ${result.affectedRows} rows affected`);

        if (result.affectedRows === 0) {
            console.log('Association not found');
            return res.status(404).json({ success: false, error: getTranslation('ASSOCIATION_NOT_FOUND', language, 'controllers', 'pushController') });
        }

        res.status(200).json({ success: true, message: getTranslation('USER_UNLINKED_FROM_TOKEN_SUCCESS', language, 'controllers', 'pushController') });
    } catch (error: any) {
        console.error('Database error:', error);
        res.status(500).json({ success: false, error: getTranslation('DATABASE_ERROR', language, 'controllers', 'pushController') });
    }
};
