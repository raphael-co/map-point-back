import { Server as SocketIOServer } from 'socket.io';

export let io: SocketIOServer | undefined;

export const setSocketServer = (ioInstance: SocketIOServer) => {
    io = ioInstance;
};

