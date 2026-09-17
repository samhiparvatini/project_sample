import { randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';

const options = {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
    hashLength: 32
} as const;

function pepper(): Buffer {
    const value = process.env.ARGON2_PASSWORD_PEPPER;
    if (!value?.trim()) throw new Error('ARGON2_PASSWORD_PEPPER is required');
    return Buffer.from(value, 'utf8');
}

export async function hashPassword(password: string): Promise<{ passwordHash: string; passwordSalt: string }> {
    const salt = randomBytes(16);
    const passwordHash = await argon2.hash(password, { ...options, salt, secret: pepper() });
    return { passwordHash, passwordSalt: salt.toString('base64') };
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
    const secret = pepper();
    if (!hash.startsWith('$argon2id$')) return false;
    try {
        // The encoded Argon2 hash includes its salt and cost parameters.
        return await argon2.verify(hash, password, { secret });
    } catch {
        return false;
    }
}
