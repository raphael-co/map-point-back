import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2/promise';  
import pool from '../utils/config/dbConnection';
import { addDays, format, getDaysInMonth, startOfWeek } from 'date-fns'; 

// Fonction pour obtenir le nombre total de marqueurs créés
export const getTotalMarkersAdmin = async (req: Request, res: Response) => {
    const connection = await pool.getConnection();
    try {
        const [totalMarkers] = await connection.query<RowDataPacket[]>(`
            SELECT COUNT(*) AS total FROM Markers;
        `);

        if (totalMarkers.length > 0) {
            res.json({ totalMarkers: totalMarkers[0].total });
        } else {
            res.json({ totalMarkers: 0 });
        }
    } catch (error) {
        console.error("Error fetching total markers: ", error);
        res.status(500).send('Server error');
    } finally {
        connection.release();
    }
};

// Fonction pour obtenir le nombre de nouveaux marqueurs cette semaine
export const getNewMarkersThisWeekAdmin = async (req: Request, res: Response) => {
    const connection = await pool.getConnection();
    try {
        const [newMarkersThisWeek] = await connection.query<RowDataPacket[]>(`
            SELECT COUNT(*) AS total FROM Markers 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK);
        `);

        if (newMarkersThisWeek.length > 0) {
            res.json({ newMarkersThisWeek: newMarkersThisWeek[0].total });
        } else {
            res.json({ newMarkersThisWeek: 0 });
        }
    } catch (error) {
        console.error("Error fetching new markers this week: ", error);
        res.status(500).send('Server error');
    } finally {
        connection.release();
    }
};

// Fonction pour obtenir le nombre de marqueurs bloqués
export const getBlockedMarkersAdmin = async (req: Request, res: Response) => {
    const connection = await pool.getConnection();
    try {
        const [blockedMarkers] = await connection.query<RowDataPacket[]>(`
            SELECT COUNT(*) AS total FROM Markers WHERE blocked = TRUE;
        `);

        if (blockedMarkers.length > 0) {
            res.json({ blockedMarkers: blockedMarkers[0].total });
        } else {
            res.json({ blockedMarkers: 0 });
        }
    } catch (error) {
        console.error("Error fetching blocked markers: ", error);
        res.status(500).send('Server error');
    } finally {
        connection.release();
    }
};

// Fonction pour obtenir les marqueurs créés par mois et année
export const getMarkersByMonthAndYear = async (req: Request, res: Response) => {
    const connection = await pool.getConnection();
    const { year: queryYear } = req.query; // Récupérer le paramètre "year" s'il est fourni

    try {
        const result: { [key: string]: { label: string, value: number }[] } = {};
        let years;

        // Vérifier si un paramètre d'année est fourni
        if (queryYear) {
            years = [{ year: parseInt(queryYear as string, 10) }];
        } else {
            // Récupérer la liste des années où il y a des marqueurs créés
            [years] = await connection.query<RowDataPacket[]>(`
                SELECT DISTINCT YEAR(created_at) AS year 
                FROM Markers
                ORDER BY year DESC;
            `);
        }

        // Parcourir chaque année et récupérer les données de marqueurs par mois
        for (const { year } of years) {
            // Récupérer les marqueurs créés par mois pour chaque année ou année spécifiée
            const [monthlyData] = await connection.query<RowDataPacket[]>(`
                SELECT MONTH(created_at) AS monthNumber, COUNT(*) AS value 
                FROM Markers 
                WHERE YEAR(created_at) = ?
                GROUP BY monthNumber
                ORDER BY monthNumber;
            `, [year]);

            // Créer un tableau avec tous les mois de l'année
            const fullMonths = Array.from({ length: 12 }, (_, i) => format(new Date(2021, i, 1), 'MMMM'));

            // Ajouter les données pour chaque mois, compléter les mois manquants avec 0
            result[year] = fullMonths.map((monthName, index) => {
                const foundMonth = monthlyData.find((row: any) => row.monthNumber === index + 1);
                return {
                    label: monthName,
                    value: foundMonth ? foundMonth.value : 0
                };
            });
        }

        res.json(result);
    } catch (error) {
        console.error("Error fetching markers by month and year: ", error);
        res.status(500).send('Server error');
    } finally {
        connection.release();
    }
};


// Fonction pour obtenir les marqueurs par jour, mois ou semaine en fonction de la période
export const getMarkersByPeriod = async (req: Request, res: Response) => {
    const connection = await pool.getConnection();
    const { period, year, month, day } = req.query;

    const yearParam = year ? parseInt(year as string, 10) : undefined;
    const monthParam = month ? parseInt(month as string, 10) : undefined;
    const dayParam = day ? parseInt(day as string, 10) : undefined;

    try {
        let query = '';
        let params: any[] = [];
        let result: { [key: string]: { label: string, value: number }[] } = {};

        if (period === 'year') {
            // Récupérer les marqueurs par année
            const [years] = await connection.query<RowDataPacket[]>(`
                SELECT DISTINCT YEAR(created_at) AS year 
                FROM Markers 
                ORDER BY year DESC;
            `);

            for (const { year } of years) {
                const [monthlyData] = await connection.query<RowDataPacket[]>(`
                    SELECT MONTHNAME(created_at) AS label, COUNT(*) AS value 
                    FROM Markers 
                    WHERE YEAR(created_at) = ?
                    GROUP BY MONTH(created_at)
                    ORDER BY MONTH(created_at);
                `, [year]);

                const fullMonths = Array.from({ length: 12 }, (_, i) => format(new Date(2021, i, 1), 'MMMM'));

                result[year] = fullMonths.map((monthName) => {
                    const foundMonth = monthlyData.find((row: any) => row.label === monthName);
                    return {
                        label: monthName,
                        value: foundMonth ? foundMonth.value : 0
                    };
                });
            }
        } else if (period === 'month' && yearParam !== undefined && monthParam !== undefined) {
            // Récupérer les marqueurs par jour pour un mois donné
            query = `
                SELECT DAY(created_at) AS label, COUNT(*) AS value 
                FROM Markers 
                WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
                GROUP BY DAY(created_at)
                ORDER BY DAY(created_at);
            `;
            params = [yearParam, monthParam];

            const [rows] = await connection.query<RowDataPacket[]>(query, params);

            const daysInMonth = getDaysInMonth(new Date(yearParam, monthParam - 1));
            const fullDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

            result[yearParam] = fullDays.map((day) => {
                const foundDay = rows.find((row: any) => row.label === day);
                return {
                    label: day.toString(),
                    value: foundDay ? foundDay.value : 0
                };
            });
        } else if (period === 'week' && yearParam !== undefined && monthParam !== undefined && dayParam !== undefined) {
            // Récupérer les marqueurs par jour de la semaine pour une semaine donnée
            query = `
                SELECT WEEKDAY(created_at) AS label, COUNT(*) AS value 
                FROM Markers 
                WHERE YEAR(created_at) = ? 
                  AND MONTH(created_at) = ? 
                  AND WEEK(created_at, 3) = WEEK(DATE(?), 3)
                GROUP BY WEEKDAY(created_at)
                ORDER BY WEEKDAY(created_at);
            `;
            const dateParam = `${yearParam}-${monthParam.toString().padStart(2, '0')}-${dayParam.toString().padStart(2, '0')}`;
            params = [yearParam, monthParam, dateParam];

            const [rows] = await connection.query<RowDataPacket[]>(query, params);

            const targetDate = new Date(yearParam, monthParam - 1, dayParam);
            const weekStartDate = startOfWeek(targetDate, { weekStartsOn: 1 });

            const fullWeekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const monthName = format(weekStartDate, 'MMMM');
            const resultKey = `${yearParam}-${monthName}`;

            result[resultKey] = fullWeekDays.map((day, index) => {
                const foundDay = rows.find((row: any) => row.label === index);
                const dayDate = addDays(weekStartDate, index);
                const formattedDate = format(dayDate, 'yyyy-MM-dd');

                return {
                    label: `${day} (${formattedDate})`,
                    value: foundDay ? foundDay.value : 0
                };
            });
        } else if (period === 'day' && yearParam !== undefined && monthParam !== undefined && dayParam !== undefined) {
            // Récupérer les marqueurs par heure pour un jour donné
            query = `
                SELECT HOUR(created_at) AS label, COUNT(*) AS value 
                FROM Markers 
                WHERE DATE(created_at) = DATE(?)
                GROUP BY HOUR(created_at)
                ORDER BY HOUR(created_at);
            `;

            const dateParam = `${yearParam}-${monthParam.toString().padStart(2, '0')}-${dayParam.toString().padStart(2, '0')}`;
            params = [dateParam];

            const [rows] = await connection.query<RowDataPacket[]>(query, params);

            const fullHours = Array.from({ length: 24 }, (_, i) => i);
            result[dateParam] = fullHours.map((hour) => {
                const foundHour = rows.find((row: any) => row.label === hour);
                return {
                    label: hour.toString().padStart(2, '0') + ':00',
                    value: foundHour ? foundHour.value : 0
                };
            });
        }

        res.json(result);
    } catch (error) {
        console.error("Error fetching markers by period:", error);
        res.status(500).send('Server error');
    } finally {
        connection.release();
    }
};


// Fonction pour obtenir les commentaires créés par mois et année
export const getCommentsByMonthAndYear = async (req: Request, res: Response) => {
    const connection = await pool.getConnection();
    const { year: queryYear } = req.query; // Récupérer le paramètre "year" s'il est fourni

    try {
        const result: { [key: string]: { label: string, value: number }[] } = {};
        let years;

        // Vérifier si un paramètre d'année est fourni
        if (queryYear) {
            years = [{ year: parseInt(queryYear as string, 10) }];
        } else {
            // Récupérer la liste des années où il y a des commentaires créés
            [years] = await connection.query<RowDataPacket[]>(`
                SELECT DISTINCT YEAR(created_at) AS year 
                FROM MarkerComments
                ORDER BY year DESC;
            `);
        }

        // Parcourir chaque année et récupérer les données de commentaires par mois
        for (const { year } of years) {
            // Récupérer les commentaires créés par mois pour chaque année ou année spécifiée
            const [monthlyData] = await connection.query<RowDataPacket[]>(`
                SELECT MONTH(created_at) AS monthNumber, COUNT(*) AS value 
                FROM MarkerComments 
                WHERE YEAR(created_at) = ?
                GROUP BY monthNumber
                ORDER BY monthNumber;
            `, [year]);

            // Créer un tableau avec tous les mois de l'année
            const fullMonths = Array.from({ length: 12 }, (_, i) => format(new Date(2021, i, 1), 'MMMM'));

            // Ajouter les données pour chaque mois, compléter les mois manquants avec 0
            result[year] = fullMonths.map((monthName, index) => {
                const foundMonth = monthlyData.find((row: any) => row.monthNumber === index + 1);
                return {
                    label: monthName,
                    value: foundMonth ? foundMonth.value : 0
                };
            });
        }

        res.json(result);
    } catch (error) {
        console.error("Error fetching comments by month and year: ", error);
        res.status(500).send('Server error');
    } finally {
        connection.release();
    }
};


// Fonction pour obtenir les commentaires par jour, mois ou semaine en fonction de la période
export const getCommentsByPeriod = async (req: Request, res: Response) => {
    const connection = await pool.getConnection();
    const { period, year, month, day } = req.query;

    const yearParam = year ? parseInt(year as string, 10) : undefined;
    const monthParam = month ? parseInt(month as string, 10) : undefined;
    const dayParam = day ? parseInt(day as string, 10) : undefined;

    try {
        let query = '';
        let params: any[] = [];
        let result: { [key: string]: { label: string, value: number }[] } = {};

        if (period === 'year') {
            // Récupérer les commentaires par année
            const [years] = await connection.query<RowDataPacket[]>(`
                SELECT DISTINCT YEAR(created_at) AS year 
                FROM MarkerComments 
                ORDER BY year DESC;
            `);

            for (const { year } of years) {
                const [monthlyData] = await connection.query<RowDataPacket[]>(`
                    SELECT MONTHNAME(created_at) AS label, COUNT(*) AS value 
                    FROM MarkerComments 
                    WHERE YEAR(created_at) = ?
                    GROUP BY MONTH(created_at)
                    ORDER BY MONTH(created_at);
                `, [year]);

                const fullMonths = Array.from({ length: 12 }, (_, i) => format(new Date(2021, i, 1), 'MMMM'));

                result[year] = fullMonths.map((monthName) => {
                    const foundMonth = monthlyData.find((row: any) => row.label === monthName);
                    return {
                        label: monthName,
                        value: foundMonth ? foundMonth.value : 0
                    };
                });
            }
        } else if (period === 'month' && yearParam !== undefined && monthParam !== undefined) {
            // Récupérer les commentaires par jour pour un mois donné
            query = `
                SELECT DAY(created_at) AS label, COUNT(*) AS value 
                FROM MarkerComments 
                WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
                GROUP BY DAY(created_at)
                ORDER BY DAY(created_at);
            `;
            params = [yearParam, monthParam];

            const [rows] = await connection.query<RowDataPacket[]>(query, params);

            const daysInMonth = getDaysInMonth(new Date(yearParam, monthParam - 1));
            const fullDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

            result[yearParam] = fullDays.map((day) => {
                const foundDay = rows.find((row: any) => row.label === day);
                return {
                    label: day.toString(),
                    value: foundDay ? foundDay.value : 0
                };
            });
        } else if (period === 'day' && yearParam !== undefined && monthParam !== undefined && dayParam !== undefined) {
            // Récupérer les commentaires par heure pour un jour donné
            query = `
                SELECT HOUR(created_at) AS label, COUNT(*) AS value 
                FROM MarkerComments 
                WHERE DATE(created_at) = DATE(?)
                GROUP BY HOUR(created_at)
                ORDER BY HOUR(created_at);
            `;

            const dateParam = `${yearParam}-${monthParam.toString().padStart(2, '0')}-${dayParam.toString().padStart(2, '0')}`;
            params = [dateParam];

            const [rows] = await connection.query<RowDataPacket[]>(query, params);

            const fullHours = Array.from({ length: 24 }, (_, i) => i);
            result[dateParam] = fullHours.map((hour) => {
                const foundHour = rows.find((row: any) => row.label === hour);
                return {
                    label: hour.toString().padStart(2, '0') + ':00',
                    value: foundHour ? foundHour.value : 0
                };
            });
        }

        res.json(result);
    } catch (error) {
        console.error("Error fetching comments by period:", error);
        res.status(500).send('Server error');
    } finally {
        connection.release();
    }
};
