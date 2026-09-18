import { Router } from 'express';
import { feedbackHandler } from './feedback.container.js';

export const feedbackRouter = Router();

feedbackRouter.get('/', feedbackHandler.getFeedback);
