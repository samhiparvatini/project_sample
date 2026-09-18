import type { Request, Response } from 'express';
import type { FeedbackService } from './feedback.service.js';

export class FeedbackHandler {
    constructor(private readonly feedbackService: FeedbackService) {}

    getFeedback = async (_req: Request, res: Response): Promise<void> => {
        try {
            const feedback = await this.feedbackService.getFeedback();
            res.json(feedback);
        } catch (error) {
            console.error('Failed to get feedback:', error);
            res.status(500).json({ message: 'Failed to get feedback' });
        }
    };
}
