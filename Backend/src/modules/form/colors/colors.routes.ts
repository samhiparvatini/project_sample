import { Router } from 'express';
import { colorHandler } from './colors.container.js';

export const colorRouter = Router();

colorRouter.get('/', colorHandler.getColors);
