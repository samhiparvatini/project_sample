import { sequelize } from '../../../db.js';
import { ColorsDao } from './colors.dao.js';
import { ColorsService } from './colors.service.js';
import { ColorsHandler } from './colors.handler.js';

const colorsDao = new ColorsDao(sequelize);
const colorsService = new ColorsService(colorsDao);

export const colorHandler = new ColorsHandler(colorsService);
