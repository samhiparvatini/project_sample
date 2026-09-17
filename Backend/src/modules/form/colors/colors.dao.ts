import { QueryTypes, type Sequelize } from 'sequelize';
import type { ColorRow } from './colors.model.js';

export class ColorsDao {
    constructor(private readonly database: Sequelize) {}

    async getColors(): Promise<ColorRow[]> {
        return this.database.query<ColorRow>(
            `SELECT "Name" AS name 
            FROM public."Colors"
            ORDER BY "Id" ASC;`,
            { type: QueryTypes.SELECT }
        );
    }
}
