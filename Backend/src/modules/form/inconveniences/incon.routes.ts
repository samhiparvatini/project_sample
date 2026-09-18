import { Router } from 'express';
import { inconsHandler } from './incon.container.js';

export const inconRouter = Router();

inconRouter.get('/', inconsHandler.getIncons);
