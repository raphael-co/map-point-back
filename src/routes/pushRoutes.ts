// src/routes/pushRoutes.ts
import express from 'express';
import pool from '../utils/config/dbConnection';
import axios from 'axios';
import { authenticateToken } from '../middleweares/authMiddleweares';

const pushRouter = express.Router();

pushRouter.post('/save-token', authenticateToken, async (req, res) => {
    const { token } = req.body;
    const userId = req.user;
    try {
        const [rows] = await pool.query('SELECT * FROM PushTokens WHERE token = ?', [token]);

        console.log(rows);
        
        if ((rows as any[]).length === 0) {
            await pool.query('INSERT INTO PushTokens (token, user_id) VALUES (?, ?)', [token, userId]);
        }
        res.status(200).send({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, error: 'Database error' });
    }
});

pushRouter.post('/send-notification', authenticateToken, async (req, res) => {
    const { title, body } = req.body;
    const userId = req.user;
    try {
        const [tokens] = await pool.query('SELECT token FROM PushTokens WHERE user_id = ?', [userId]);

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
    const userId = req.user;
    console.log(token);
    
    try {
        const [result] = await pool.query('DELETE FROM PushTokens WHERE token = ? AND user_id = ?', [token, userId]);
        if ((result as any).affectedRows === 0) {
            res.status(404).json({ success: false, error: 'Token not found or not associated with the user' });
        } else {
            res.status(200).json({ success: true });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});


export default pushRouter;
