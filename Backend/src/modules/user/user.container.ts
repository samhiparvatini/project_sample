import { sequelize } from '../../db.js';
import { UserDao } from './user.dao.js';
import { UserHandler } from './user.handler.js';
import { UserService } from './user.service.js';

const userDao = new UserDao(sequelize);
const userService = new UserService(userDao);

export const userHandler = new UserHandler(userService);
