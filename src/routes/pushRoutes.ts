// src/routes/pushRoutes.ts
import express from 'express';
import pool from '../utils/config/dbConnection';
import axios from 'axios';
import { authenticateToken } from '../middleweares/authMiddleweares';

const pushRouter = express.Router();

pushRouter.post('/save-token', authenticateToken, async (req, res) => {
    const { token } = req.body;
    const userId = req.user?.id;
    try {
        console.log('saving token');
        console.log(token);

        // Check if the token already exists in the PushTokens table
        let [rows] = await pool.query('SELECT id FROM PushTokens WHERE token = ?', [token]);
        let tokenId;

        if ((rows as any[]).length === 0) {
            // Insert the token into the PushTokens table if it does not exist
            const [result] = await pool.query('INSERT INTO PushTokens (token) VALUES (?)', [token]);
            tokenId = (result as any).insertId;
        } else {
            tokenId = (rows as any)[0].id;
        }

        // Associate the token with the user in the UserPushTokens table
        [rows] = await pool.query('SELECT * FROM UserPushTokens WHERE user_id = ? AND push_token_id = ?', [userId, tokenId]);
        if ((rows as any[]).length === 0) {
            await pool.query('INSERT INTO UserPushTokens (user_id, push_token_id) VALUES (?, ?)', [userId, tokenId]);
        }

        res.status(200).send({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, error: 'Database error' });
    }
});

pushRouter.post('/send-notification', authenticateToken, async (req, res) => {
    const { title, body } = req.body;
    const userId = req.user?.id;
    try {
        // Get the tokens associated with the user from the UserPushTokens table
        const [tokens] = await pool.query(`
            SELECT pt.token 
            FROM UserPushTokens upt 
            JOIN PushTokens pt ON upt.push_token_id = pt.id 
            WHERE upt.user_id = ?
        `, [userId]);

        console.log(tokens);

        const messages = (tokens as any[]).map(token => ({
            to: token.token.trim(),
            sound: 'default',
            title,
            body,
            data: { someData: 'goes here' },
        }));
        console.log(messages);

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
});

pushRouter.post('/remove-push-token', authenticateToken, async (req, res) => {
    const { token } = req.body;
    const userId = req.user?.id;
    console.log(token);

    try {
        // Find the push token ID
        const [tokenRows] = await pool.query('SELECT id FROM PushTokens WHERE token = ?', [token]);
        if ((tokenRows as any[]).length === 0) {
            return res.status(404).json({ success: false, error: 'Token not found' });
        }
        const tokenId = (tokenRows as any)[0].id;

        // Remove the association in UserPushTokens
        const [result] = await pool.query('DELETE FROM UserPushTokens WHERE push_token_id = ? AND user_id = ?', [tokenId, userId]);
        if ((result as any).affectedRows === 0) {
            res.status(404).json({ success: false, error: 'Token not found or not associated with the user' });
        } else {
            // Optionally, delete the token from PushTokens if it has no associations left
            const [remainingAssociations] = await pool.query('SELECT * FROM UserPushTokens WHERE push_token_id = ?', [tokenId]);
            if ((remainingAssociations as any[]).length === 0) {
                await pool.query('DELETE FROM PushTokens WHERE id = ?', [tokenId]);
            }
            res.status(200).json({ success: true });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

pushRouter.post('/send-notification-to-users', async (req, res) => {
    const { title, body } = req.body;
    const targetUserIds = [1, 2]; // IDs of the users to whom you want to send the notification

    try {
        // Fetch tokens for the specified users
        const [tokens] = await pool.query(`
            SELECT DISTINCT pt.token 
            FROM UserPushTokens upt 
            JOIN PushTokens pt ON upt.push_token_id = pt.id 
            WHERE upt.user_id IN (?, ?)
        `, targetUserIds);

        console.log(tokens);

        // Remove duplicate tokens
        const uniqueTokens = Array.from(new Set((tokens as any[]).map(token => token.token.trim())));

        const messages = uniqueTokens.map(token => ({
            to: token,
            sound: 'default',
            title,
            body,
            data: { someData: 'goes here' },
        }));
        console.log(messages);

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
});

export default pushRouter;
