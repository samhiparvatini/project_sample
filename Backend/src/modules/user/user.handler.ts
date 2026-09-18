import { tokenRevocations } from '../../services/auth.container.js';
import type { TokenRevocations } from '../../services/token-revocation.service.js';
import type { Request, Response } from 'express';
import { UniqueConstraintError } from 'sequelize';
import type { UserService } from './user.service.js';
import { tokenService } from '../../services/token.service.js';
import type { CreateUserInput } from './user.model.js';

export class UserHandler {
    constructor(private readonly userService: UserService, private readonly revocations: TokenRevocations = tokenRevocations) {}

    createUser = async (req: Request, res: Response): Promise<void> => {
        const input = this.validateCreateUser(req.body);
        if (!input) {
            res.status(400).json({
                message: 'firstName, lastName, userName, and password are required'
            });
            return;
        }

        try {
            const user = await this.userService.createUser(input);
            res.status(201).json(tokenService.issue(user));
        } catch (error) {
            if (error instanceof UniqueConstraintError) {
                res.status(409).json({ message: 'That user name is already taken' });
                return;
            }

            console.error('Failed to create user');
            res.status(500).json({ message: 'Failed to create user' });
        }
    };

    login = async (req: Request, res: Response): Promise<void> => {
        const body: unknown = req.body;
        if (!this.isRecord(body)) {
            res.status(400).json({ message: 'userName and password are required' });
            return;
        }
        const userName = this.nonEmptyString(body.userName);
        const password = body.password;
        if (!userName || userName.length > 100 || typeof password !== 'string' || !password.length || password.length > 1024) {
            res.status(400).json({ message: 'Valid userName and password are required' });
            return;
        }
        try {
            const user = await this.userService.login(userName, password);
            if (!user) {
                res.status(401).json({ message: 'Invalid username or password' });
                return;
            }
            res.json(tokenService.issue(user));
        } catch {
            res.status(500).json({ message: 'Unable to log in' });
        }
    };

    logout = async (req: Request, res: Response): Promise<void> => {
        const token = req.headers.authorization?.split(' ')[1];
        if (!req.auth || !token) { res.status(401).json({ message: 'Authentication required' }); return; }
        try {
            await this.revocations.revoke(token, req.auth.expiresAt);
            res.status(204).send();
        } catch {
            res.status(503).json({ message: 'Unable to log out. Please try again.' });
        }
    };

    verifyToken = async (req: Request, res: Response): Promise<void> => {
        if (!req.auth) { res.status(401).json({ message: 'Authentication required' }); return; }
        try {
            const user = await this.userService.getUserById(req.auth.userId);
            if (!user) { res.status(401).json({ message: 'Account no longer exists' }); return; }
            res.json({ ...user, expiresAt: req.auth.expiresAt });
        } catch {
            res.status(500).json({ message: 'Unable to verify session' });
        }
    };

    getUserById = async (req: Request, res: Response): Promise<void> => {
        const userId = Number(req.params.userId);
        if (req.auth?.userId !== userId) { res.status(403).json({ message: 'Access denied' }); return; }
        if (!Number.isInteger(userId) || userId <= 0) {
            res.status(400).json({ message: 'userId must be a positive integer' });
            return;
        }

        try {
            const user = await this.userService.getUserById(userId);
            if (!user) {
                res.status(404).json({ message: 'User not found' });
                return;
            }

            res.json(user);
        } catch (error) {
            console.error('Failed to get user:', error);
            res.status(500).json({ message: 'Failed to get user' });
        }
    };

    private validateCreateUser(value: unknown): CreateUserInput | null {
        if (!this.isRecord(value)) return null;

        const firstName = this.nonEmptyString(value.firstName);
        const lastName = this.nonEmptyString(value.lastName);
        const userName = this.nonEmptyString(value.userName);
        const password = typeof value.password === 'string' ? value.password : null;

        if (!firstName || !lastName || !userName || !password) return null;
        if (userName.length > 100 || password.length < 8 || password.length > 1024) return null;

        return { firstName, lastName, userName, password };
    }

    private isRecord(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null;
    }

    private nonEmptyString(value: unknown): string | null {
        if (typeof value !== 'string') return null;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }
}
