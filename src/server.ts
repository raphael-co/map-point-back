import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import routes from './routes/routes';
import { initializeDatabase } from './utils/config/databaseInit';
import { setSocketServer } from './controllers/setSocketServer';
import jwt, { JwtPayload } from 'jsonwebtoken'; // Importation de JwtPayload pour les types
import dotenv from 'dotenv';

dotenv.config();

const SECRET_KEY = process.env.SECRET_KEY;

const app = express();
const port = 3000;

// Configure CORS options
const corsOptions = {
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'PUT','PATCH', 'OPTIONS', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50gb' }));
app.use(express.urlencoded({ extended: true, limit: '10gb' }));

// Use API routes
app.use('/api', routes);

// Create HTTP server and integrate Socket.IO
const server = http.createServer(app);
const io = new SocketIOServer(server, {
    path: '/api/socket', // Set the path for Socket.IO
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT','PATCH', 'OPTIONS', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    }
});

// Set the Socket.IO server instance
setSocketServer(io);

// Set up Socket.IO connection
io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Récupérer le token depuis la requête de connexion
    const token = socket.handshake.query.token;

    if (token && typeof token === 'string' && SECRET_KEY) {
        try {
            // Vérifier et décoder le token
            const decoded = jwt.verify(token, SECRET_KEY); 

            // Assurez-vous que le token contient l'ID utilisateur et est de type JwtPayload
            if (typeof decoded !== 'string' && 'id' in decoded) {
                const userId = (decoded as JwtPayload).id; // Utilisation de type assertion pour JwtPayload
                // Ajouter le socket à une salle spécifique à l'utilisateur
                socket.join(`user_${userId}`);
                console.log(`User ${userId} joined room user_${userId}`);

                // Écouter d'autres événements si nécessaire
            } else {
                console.error('Token does not contain user ID');
                socket.disconnect();
            }
        } catch (err) {
            console.error('Token validation failed:', err);
            socket.disconnect(); // Déconnecter le socket si la validation échoue
        }
    } else {
        console.error('No valid token provided or token is not a string');
        socket.disconnect(); // Déconnecter le socket si aucun token n'est fourni ou si le token n'est pas valide
    }

    socket.on('message', (data) => {
        console.log(`Message from client: ${data}`);
        io.emit('message', data);
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

// Start the server
server.listen(port, async () => {
    console.log(`Server running at http://localhost:${port}/`);
    await initializeDatabase();
});
