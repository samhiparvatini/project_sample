import { QueryTypes, type Sequelize } from 'sequelize';
import type { InconRow } from './incon.model.js';

export class InconDao {
    constructor(private readonly database: Sequelize) {}

    async getIncons(): Promise<InconRow[]> {
        return this.database.query<InconRow>(
            `SELECT "Name" AS name 
            FROM public."Inconveniences"
            ORDER BY "Id" ASC;`,
            { type: QueryTypes.SELECT }
        );
    }
}