import { Request, Response, NextFunction } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import pool from '../../utils/config/dbConnection';

export const InserUserActif = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;

    if (!userId) {
        return next(); // Si l'utilisateur n'est pas connecté, on passe au middleware suivant
    }

    const connection = await pool.getConnection();

    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    try {
        // Vérifier si l'utilisateur est déjà enregistré pour le mois en cours
        const [rows] = await connection.query<RowDataPacket[]>(`
            SELECT * 
            FROM ActiveUsers 
            WHERE user_id = ? AND year = ? AND month = ?
        `, [userId, year, month]);

        if (rows.length === 0) {
            await connection.query(`
                INSERT INTO ActiveUsers (user_id, year, month) 
                VALUES (?, ?, ?)
            `, [userId, year, month]);
        } else {
            console.log(`User ${userId} is already marked as active for ${month}/${year}`);
        }

    } catch (error: any) {
        // Vérifier si l'erreur est liée à une clé dupliquée
        if (error.code === 'ER_DUP_ENTRY') {
            console.log(`Duplicate entry for user ${userId} for ${month}/${year}. Skipping.`);
            return next(); // Continuer si c'est une erreur de duplication
        }

        // Si ce n'est pas une erreur de clé dupliquée, loguer l'erreur et appeler next() avec l'erreur
        console.error("Error inserting active user for the month: ", error);
        return next(error);
    } finally {
        connection.release();
    }

    next(); // Passer au middleware suivant
};
