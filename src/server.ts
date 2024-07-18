import express from 'express';
import cors from 'cors';
import routes from './routes/routes';
import { initializeDatabase } from './utils/config/databaseInit';
// import fileRoutes from './routes/fileRoutes';
// import { initializeDatabase } from './config/databaseInit';

const app = express();
const port = 3000;

const corsOptions = {
    origin: '*', // Autoriser toutes les origines
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50gb' }));
app.use(express.urlencoded({ extended: true, limit: '10gb' }));

app.use('/api', routes);

app.listen(port, async () => {
    console.log(`Server running at http://localhost:${port}/`);

    // Initialize the database
    await initializeDatabase();
});
