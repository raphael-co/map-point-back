import { JwtPayload } from 'jsonwebtoken';

interface UserPayload extends JwtPayload {
    id: number;
    email: string;
    role: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: UserPayload;
            rateLimit?: {
                resetTime?: Date;
                remaining?: number;
                limit: number,
                used: number,
              // Ajoutez d'autres propriétés si nécessaire
            };
        }
    }
}
