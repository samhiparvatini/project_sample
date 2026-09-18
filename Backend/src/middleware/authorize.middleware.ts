import { tokenRevocations } from '../services/auth.container.js';
import type { TokenRevocations } from '../services/token-revocation.service.js';
import type { RequestHandler } from 'express';
import { tokenService, type TokenService } from '../services/token.service.js';

export function createAuthorizeMiddleware(tokens: TokenService, revocations: TokenRevocations): RequestHandler {
    return async (req, res, next) => {
        const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization ?? '');
        if (!match) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        try {
            req.auth = tokens.verify(match[1]!);
        } catch {
            res.status(401).json({ message: 'Invalid or expired token' });
            return;
        }
        try {
            if (await revocations.isRevoked(match[1]!)) {
                res.status(401).json({ message: 'Token has been revoked' });
                return;
            }
        } catch {
            res.status(503).json({ message: 'Authentication is temporarily unavailable' });
            return;
        }
        next();
    };
}

export const authorize = createAuthorizeMiddleware(tokenService, tokenRevocations);
