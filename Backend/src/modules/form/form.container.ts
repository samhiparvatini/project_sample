import { sequelize } from '../../db.js';
import { FormDao } from './form.dao.js';
import { FormService } from './form.service.js';
import { FormHandler } from './form.handler.js';

const formDao = new FormDao(sequelize);
const formService = new FormService(formDao);

export const formHandler = new FormHandler(formService);
