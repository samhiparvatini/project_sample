import type { FeedbackDao } from './feedback.dao.js';
import type { FeedbackRow } from './feedback.model.js';

export class FeedbackService {
    constructor(private readonly feedbackDao: FeedbackDao) {}

    async getFeedback(): Promise<FeedbackRow[]> {
        return this.feedbackDao.getFeedback();
    }
}
