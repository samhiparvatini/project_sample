import { Router } from 'express';
import { userHandler } from './user.container.js';

export const userRouter = Router();

userRouter.post('/login', userHandler.login);
userRouter.post('/', userHandler.createUser);
userRouter.get('/:userId', userHandler.getUserById);
