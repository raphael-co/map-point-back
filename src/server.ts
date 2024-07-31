import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import routes from './routes/routes';
import { initializeDatabase } from './utils/config/databaseInit';
import { setSocketServer } from './controllers/markerController';

const app = express();
const port = 3000;

// Configure CORS options
const corsOptions = {
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    }
});

// Set up Socket.IO connection
io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    socket.on('message', (data) => {
        console.log(`Message from client: ${data}`);
        io.emit('message', data);
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

// Set the Socket.IO server instance
setSocketServer(io);

// Start the server
server.listen(port, async () => {
    console.log(`Server running at http://localhost:${port}/`);
    await initializeDatabase();
});
