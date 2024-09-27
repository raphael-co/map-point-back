import { Request, Response, NextFunction } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import pool from '../../utils/config/dbConnection';

export const InserUserActif = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;

    if (!userId) {
        // Si l'utilisateur n'est pas connecté, on passe au middleware suivant
        return next();
    }

    const connection = await pool.getConnection();
    try {
        // Obtenir l'année et le mois actuels
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;

        // Vérifier si l'utilisateur est déjà enregistré comme actif pour le mois en cours
        const [rows] = await connection.query<RowDataPacket[]>(`
            SELECT * 
            FROM ActiveUsers 
            WHERE user_id = ? AND year = ? AND month = ?
        `, [userId, year, month]);

        if (rows.length === 0) {
            // Si l'utilisateur n'est pas encore enregistré ce mois-ci, on l'insère
            await connection.query(`
                INSERT INTO ActiveUsers (user_id, year, month, active_users_count) 
                VALUES (?, ?, ?, 1)
            `, [userId, year, month]);
        } else {
            // L'utilisateur est déjà marqué comme actif pour ce mois, ne pas réinsérer ou mettre à jour
            console.log(`User ${userId} is already marked as active for ${month}/${year}`);
        }

    } catch (error) {
        console.error("Error inserting active user for the month: ", error);
        // On peut choisir de répondre avec une erreur, mais je recommande de continuer le traitement
        // en appelant `next(error)` pour ne pas bloquer la requête principale.
        return next(error);
    } finally {
        connection.release();
    }

    next(); // Passer au middleware suivant
};
