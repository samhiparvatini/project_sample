import type { ColorsDao } from './colors.dao.js';
import type { ColorRow } from './colors.model.js';

export class ColorsService {
    constructor(private readonly colorsDao: ColorsDao) {}

    async getColors(): Promise<ColorRow[]> {
        return this.colorsDao.getColors();
    }
}
