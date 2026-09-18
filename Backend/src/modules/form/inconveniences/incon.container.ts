import { sequelize } from '../../../db.js';
import { InconDao } from './incon.dao.js';
import { InconsService } from './incon.service.js';
import { InconsHandler } from './incon.handler.js';

const inconDao = new InconDao(sequelize);
const inconsService = new InconsService(inconDao);

export const inconsHandler = new InconsHandler(inconsService);