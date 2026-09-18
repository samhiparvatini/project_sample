import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { UserData } from '../modules/user/user.model.js';

export const TOKEN_ISSUER = 'survey-api';
export const TOKEN_AUDIENCE = 'survey-web';
export interface AuthSession extends UserData {
    token: string;
    expiresAt: number;
}

export class TokenService {
    constructor(private readonly getSecret: () => string = () => {
        const secret = process.env.JWT_SECRET;
        if (!secret || Buffer.byteLength(secret) < 32) throw new Error('JWT_SECRET must contain at least 32 bytes');
        return secret;
    }) {}

    assertConfigured(): void {
        this.getSecret();
    }

    issue(user: UserData): AuthSession {
        const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60;
        const token = jwt.sign({ userName: user.userName, exp: expiresAt }, this.getSecret(), {
            jwtid: randomUUID(), algorithm: 'HS256', subject: String(user.userId),
            issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE,
        });
        return { ...user, token, expiresAt };
    }

    verify(token: string): { userId: number; expiresAt: number } {
        const claims = jwt.verify(token, this.getSecret(), {
            algorithms: ['HS256'], issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE,
        });
        if (typeof claims === 'string' || !claims.sub || !/^\d+$/.test(claims.sub)
            || !Number.isSafeInteger(Number(claims.sub)) || Number(claims.sub) <= 0
            || typeof claims.exp !== 'number') throw new Error('Invalid token claims');
        return { userId: Number(claims.sub), expiresAt: claims.exp };
    }
}

export const tokenService = new TokenService();
