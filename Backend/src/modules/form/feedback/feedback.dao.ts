import { QueryTypes, type Sequelize } from 'sequelize';
import type { FeedbackRow } from './feedback.model.js';

export class FeedbackDao {
    constructor(private readonly database: Sequelize) {}

    async getFeedback(): Promise<FeedbackRow[]> {
        return this.database.query<FeedbackRow>(
            `SELECT "Choice" AS choice
            FROM public."Feedback"
            ORDER BY "Id" ASC;`,
            { type: QueryTypes.SELECT }
        );
    }
}
