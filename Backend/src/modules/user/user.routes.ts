import { authorize } from '../../middleware/authorize.middleware.js';
import { Router } from 'express';
import { userHandler } from './user.container.js';

export const userRouter = Router();

userRouter.post('/login', userHandler.login);
userRouter.post('/logout', authorize, userHandler.logout);
userRouter.post('/', userHandler.createUser);
userRouter.get('/verify', authorize, userHandler.verifyToken);
userRouter.get('/:userId', authorize, userHandler.getUserById);
