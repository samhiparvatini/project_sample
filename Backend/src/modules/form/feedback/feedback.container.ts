import { sequelize } from '../../../db.js';
import { FeedbackDao } from './feedback.dao.js';
import { FeedbackService } from './feedback.service.js';
import { FeedbackHandler } from './feedback.handler.js';

const feedbackDao = new FeedbackDao(sequelize);
const feedbackService = new FeedbackService(feedbackDao);

export const feedbackHandler = new FeedbackHandler(feedbackService);
