import { JwtPayload } from 'jsonwebtoken';

interface UserPayload extends JwtPayload {
    id: number;
    email: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: UserPayload;
        }
    }
}
