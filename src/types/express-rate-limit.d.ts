// src/types/express-rate-limit.d.ts

import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    rateLimit?: {
        resetTime?: Date;
        remaining?: number;
        limit: number,
        used: number,
      // Ajoutez d'autres propriétés si nécessaire
    };
  }
}
