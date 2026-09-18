import { sequelize } from '../db.js';
import { TokenRevocationService } from './token-revocation.service.js';

export const tokenRevocations = new TokenRevocationService(sequelize);
