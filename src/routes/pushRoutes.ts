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
        const [rows] = await pool.query('SELECT * FROM PushTokens WHERE token = ?', [token]);
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
    const userId = req.user?.id;

    try {
        const [tokens] = await pool.query('SELECT token FROM PushTokens WHERE user_id = ?', [userId]);
        const messages = (tokens as any[]).map(token => ({
            to: token.token,
            sound: 'default',
            title,
            body,
            data: { someData: 'goes here' },
        }));

        const results = await Promise.all(
            messages.map(message =>
                axios.post('https://exp.host/--/api/v2/push/send', message, {
                    headers: {
                        'Accept': 'application/json',
                        'Accept-Encoding': 'gzip, deflate',
                        'Content-Type': 'application/json',
                    }
                })
            )
        );

        res.status(200).send({ success: true, results });
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, error: 'Notification sending error' });
    }
});

export default pushRouter;
