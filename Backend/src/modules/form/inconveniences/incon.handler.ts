import type { Request, Response } from 'express';
import type { InconsService } from './incon.service.js';

export class InconsHandler {
    constructor(private readonly inconsService: InconsService) {}

    getIncons = async (_req: Request, res: Response): Promise<void> => {
        try {
            const incons = await this.inconsService.getIncons();
            res.json(incons);
        } catch (error) {
            console.error('Failed to get inconveniences:', error);
            res.status(500).json({ message: 'Failed to get inconveniences' });
        }
    };
}
