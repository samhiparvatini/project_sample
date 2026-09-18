import { createHash } from 'node:crypto';
import { QueryTypes, type Sequelize } from 'sequelize';

export interface TokenRevocations {
    isRevoked(token: string): Promise<boolean>;
    revoke(token: string, expiresAt: number): Promise<void>;
}

export class TokenRevocationService implements TokenRevocations {
    constructor(private readonly database: Sequelize) {}

    async isRevoked(token: string): Promise<boolean> {
        const rows = await this.database.query<{ revoked: boolean }>(
            `SELECT EXISTS (SELECT 1 FROM public.revoked_tokens
             WHERE token_hash = :hash AND expires_at > CURRENT_TIMESTAMP) AS revoked`,
            { replacements: { hash: this.hash(token) }, type: QueryTypes.SELECT }
        );
        return rows[0]?.revoked === true;
    }

    async revoke(token: string, expiresAt: number): Promise<void> {
        await this.database.query(
            `WITH cleanup AS (DELETE FROM public.revoked_tokens WHERE expires_at <= CURRENT_TIMESTAMP)
             INSERT INTO public.revoked_tokens (token_hash, expires_at)
             VALUES (:hash, to_timestamp(:expiresAt)) ON CONFLICT (token_hash) DO NOTHING`,
            { replacements: { hash: this.hash(token), expiresAt } }
        );
    }

    private hash(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }
}
