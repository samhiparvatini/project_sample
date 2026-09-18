import type { InconDao } from './incon.dao.js';
import type { InconRow } from './incon.model.js';

export class InconsService {
    constructor(private readonly InconDao: InconDao) {}

    async getIncons(): Promise<InconRow[]> {
        return this.InconDao.getIncons();
    }
}