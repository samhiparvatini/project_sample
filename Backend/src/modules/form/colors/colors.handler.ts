import type { Request, Response } from 'express';
import type { ColorsService } from './colors.service.js';

export class ColorsHandler {
    constructor(private readonly colorsService: ColorsService) {}

    getColors = async (_req: Request, res: Response): Promise<void> => {
        try {
            const colors = await this.colorsService.getColors();
            res.json(colors);
        } catch (error) {
            console.error('Failed to get colors:', error);
            res.status(500).json({ message: 'Failed to get colors' });
        }
    };
}
