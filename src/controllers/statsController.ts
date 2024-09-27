import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2/promise';  // Importer les types pour les résultats de la requête
import pool from '../utils/config/dbConnection';
import { addDays, format, getDaysInMonth, startOfWeek } from 'date-fns'; // Assurez-vous d'avoir installé date-fns

interface UsersResult {
    newUsersThisWeek?: number;
    totalUsers?: number;
    newUsersThisMonth?: number;
    [key: string]: any; // Si vous prévoyez d'autres propriétés dynamiques
}

interface UsersByYear {
    [key: string]: { label: string, value: number }[];
}

// Fonction pour obtenir le nombre total d'utilisateurs
export const getTotalUsersAdmin = async (req: Request, res: Response) => {
    const connection = await pool.getConnection();
    try {
        const [totalUsers] = await connection.query<RowDataPacket[]>(`
            SELECT COUNT(*) AS total FROM users;
        `);

        if (totalUsers.length > 0) {
            res.json({ totalUsers: totalUsers[0].total });
        } else {
            res.json({ totalUsers: 0 });
        }
    } catch (error) {
        console.error("Error fetching total users: ", error);
        res.status(500).send('Server error');
    } finally {
        connection.release();
    }
};

// Fonction pour obtenir le nombre de nouveaux utilisateurs cette semaine
export const getNewUsersThisWeekAdmin = async (req: Request, res: Response) => {
    const connection = await pool.getConnection();
    try {
        const [newUsersThisWeek] = await connection.query<RowDataPacket[]>(`
            SELECT COUNT(*) AS total FROM users 
            WHERE joined_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK);
        `);

        if (newUsersThisWeek.length > 0) {
            res.json({ newUsersThisWeek: newUsersThisWeek[0].total });
        } else {
            res.json({ newUsersThisWeek: 0 });
        }
    } catch (error) {
        console.error("Error fetching new users this week: ", error);
        res.status(500).send('Server error');
    } finally {
        connection.release();
    }
};

// Fonction pour obtenir le nombre d'utilisateurs actifs (dernière connexion dans le dernier mois)
export const getActiveUsersAdmin = async (req: Request, res: Response) => {
    const connection = await pool.getConnection();
    try {
        const [activeUsers] = await connection.query<RowDataPacket[]>(`
            SELECT COUNT(*) AS total FROM users 
            WHERE last_login >= DATE_SUB(NOW(), INTERVAL 1 MONTH);
        `);

        if (activeUsers.length > 0) {
            res.json({ activeUsers: activeUsers[0].total });
        } else {
            res.json({ activeUsers: 0 });
        }
    } catch (error) {
        console.error("Error fetching active users: ", error);
        res.status(500).send('Server error');
    } finally {
        connection.release();
    }
};

export const getNewUsersAdmin = async (req: Request, res: Response) => {
    const connection = await pool.getConnection();
    const { period, year, month, day } = req.query;

    // Conversion explicite des paramètres en nombres seulement s'ils existent
    const yearParam = year ? parseInt(year as string, 10) : undefined;
    const monthParam = month ? parseInt(month as string, 10) : undefined;
    const dayParam = day ? parseInt(day as string, 10) : undefined;

    try {
        let query = '';
        let params: any[] = [];
        let result: UsersByYear = {};

        if (period === 'year') {
            // Récupérer la liste des années
            const [years] = await connection.query<RowDataPacket[]>(`
                SELECT DISTINCT YEAR(joined_at) AS year 
                FROM users 
                ORDER BY year DESC;
            `);

            for (const { year } of years) {
                // Récupérer les données par mois pour chaque année
                const [monthlyData] = await connection.query<RowDataPacket[]>(`
                    SELECT MONTHNAME(joined_at) AS label, COUNT(*) AS value 
                    FROM users 
                    WHERE YEAR(joined_at) = ?
                    GROUP BY MONTH(joined_at)
                    ORDER BY MONTH(joined_at);
                `, [year]);

                // Créer un tableau des mois pour remplir les mois manquants
                const fullMonths = Array.from({ length: 12 }, (_, i) => format(new Date(2021, i, 1), 'MMMM'));

                // Ajouter les données de l'année au résultat, compléter avec les mois manquants
                result[year] = fullMonths.map((monthName) => {
                    const foundMonth = monthlyData.find((row: any) => row.label === monthName);
                    return {
                        label: monthName,
                        value: foundMonth ? foundMonth.value : 0
                    };
                });
            }
        } else if (period === 'month' && yearParam !== undefined && monthParam !== undefined) {
            // Cas pour filtrer par mois et retourner les jours
            query = `
                SELECT DAY(joined_at) AS label, COUNT(*) AS value 
                FROM users 
                WHERE YEAR(joined_at) = ? AND MONTH(joined_at) = ?
                GROUP BY DAY(joined_at)
                ORDER BY DAY(joined_at);
            `;
            params = [yearParam, monthParam];

            const [rows] = await connection.query<RowDataPacket[]>(query, params);

            // Obtenez le nombre total de jours dans le mois
            const daysInMonth = getDaysInMonth(new Date(yearParam, monthParam - 1));

            // Complétez les jours manquants avec une valeur de 0
            const fullDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

            result[yearParam] = fullDays.map((day) => {
                const foundDay = rows.find((row: any) => row.label === day);
                return {
                    label: day.toString(), // Convertir le numéro du jour en chaîne
                    value: foundDay ? foundDay.value : 0
                };
            });
        }
        else if (period === 'week' && yearParam !== undefined && monthParam !== undefined && dayParam !== undefined) {
            // Cas pour filtrer par jour et retourner la semaine associée à ce jour
            query = `
                SELECT WEEKDAY(joined_at) AS label, COUNT(*) AS value 
                FROM users 
                WHERE YEAR(joined_at) = ? 
                  AND MONTH(joined_at) = ? 
                  AND WEEK(joined_at, 3) = WEEK(DATE(?), 3)
                GROUP BY WEEKDAY(joined_at)
                ORDER BY WEEKDAY(joined_at);
            `;
            const dateParam = `${yearParam}-${monthParam}-${dayParam}`;
            params = [yearParam, monthParam, dateParam];

            const [rows] = await connection.query<RowDataPacket[]>(query, params);

            // Calculez la date de début de la semaine à partir de la date spécifiée
            const targetDate = new Date(yearParam, monthParam - 1, dayParam);
            const weekStartDate = startOfWeek(targetDate, { weekStartsOn: 1 }); // Lundi est le premier jour de la semaine
            const monthName = format(weekStartDate, 'MMMM'); // Récupère le nom du mois

            // Liste complète des jours de la semaine avec les dates
            const fullWeekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

            // Clé du résultat incluant l'année et le mois (ex : "2024-February")
            const resultKey = `${yearParam}-${monthName}`;

            result[resultKey] = fullWeekDays.map((day, index) => {
                const foundDay = rows.find((row: any) => row.label === index);
                const dayDate = addDays(weekStartDate, index); // Ajouter les jours à la date de début de la semaine
                const formattedDate = format(dayDate, 'yyyy-MM-dd'); // Formater la date au format souhaité

                return {
                    label: `${day} (${formattedDate})`, // Ajoutez la date au label
                    value: foundDay ? foundDay.value : 0
                };
            });
        }
        else if (period === 'day' && yearParam !== undefined && monthParam !== undefined && dayParam !== undefined) {
            // Cas pour filtrer par jour et retourner les heures associées à ce jour spécifique
            query = `
                SELECT HOUR(joined_at) AS label, COUNT(*) AS value 
                FROM users 
                WHERE DATE(joined_at) = DATE(?) 
                GROUP BY HOUR(joined_at)
                ORDER BY HOUR(joined_at);
            `;

            // Construire la date à partir des paramètres year, month et day
            const dateParam = `${yearParam}-${monthParam.toString().padStart(2, '0')}-${dayParam.toString().padStart(2, '0')}`;
            params = [dateParam];

            const [rows] = await connection.query<RowDataPacket[]>(query, params);

            // Créer un tableau avec toutes les heures de 00 à 23
            const fullHours = Array.from({ length: 24 }, (_, i) => i); // [0, 1, 2, ..., 23]

            // Mappez les données existantes ou assignez 0 pour les heures manquantes
            result[dateParam] = fullHours.map((hour) => {
                const foundHour = rows.find((row: any) => row.label === hour);
                return {
                    label: hour.toString().padStart(2, '0') + ':00', // Format "00:00"
                    value: foundHour ? foundHour.value : 0
                };
            });
        }

        else {
            // Cas par défaut : Utilisateurs par jour de la semaine glissante
            query = `
                SELECT WEEKDAY(joined_at) AS label, COUNT(*) AS value 
                FROM users 
                WHERE joined_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK)
                GROUP BY WEEKDAY(joined_at)
                ORDER BY WEEKDAY(joined_at);
            `;

            const [rows] = await connection.query<RowDataPacket[]>(query);

            // Liste complète des jours de la semaine
            const fullWeekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

            result['This Week'] = fullWeekDays.map((day, index) => {
                const foundDay = rows.find((row: any) => row.label === index);
                return {
                    label: day, // Nom du jour de la semaine
                    value: foundDay ? foundDay.value : 0
                };
            });
        }

        res.json(result);
    } catch (error) {
        console.error("Error fetching new users:", error);
        res.status(500).send('Server error');
    } finally {
        connection.release();
    }
};


export const getActiveUsersByMonthAndYear = async (req: Request, res: Response) => {
    const connection = await pool.getConnection();
    try {
        const result: { [key: string]: { label: string, value: number }[] } = {};

        // Récupérer la liste des années où il y a des utilisateurs actifs
        const [years] = await connection.query<RowDataPacket[]>(`
            SELECT DISTINCT year 
            FROM ActiveUsers
            ORDER BY year DESC;
        `);

        // Parcourir chaque année et récupérer les données d'activité par mois
        for (const { year } of years) {
            // Récupérer les utilisateurs actifs par mois pour chaque année
            const [monthlyData] = await connection.query<RowDataPacket[]>(`
                SELECT month AS monthNumber, COUNT(*) AS value 
                FROM ActiveUsers 
                WHERE year = ?
                GROUP BY month
                ORDER BY month;
            `, [year]);

            // Créer un tableau avec tous les mois de l'année
            const fullMonths = Array.from({ length: 12 }, (_, i) => format(new Date(2021, i, 1), 'MMMM'));

            // Ajouter les données pour chaque mois, compléter les mois manquants avec 0
            result[year] = fullMonths.map((monthName, index) => {
                const foundMonth = monthlyData.find((row: any) => row.monthNumber === index + 1); // index + 1 pour correspondre aux mois (1-12)
                return {
                    label: monthName,
                    value: foundMonth ? foundMonth.value : 0
                };
            });
        }

        res.json(result);
    } catch (error) {
        console.error("Error fetching active users by month: ", error);
        res.status(500).send('Server error');
    } finally {
        connection.release();
    }
};




