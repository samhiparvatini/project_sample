import { Router } from 'express';
import { formHandler } from './form.container.js';

export const formRouter = Router();

formRouter.get('/', formHandler.getForms);

formRouter.post('/', formHandler.createForm);
formRouter.patch('/:formId/status', formHandler.requireOwner, formHandler.updateFormStatus);

formRouter.get('/:formId/answers', formHandler.getAnswers);
formRouter.patch('/:formId/answers', formHandler.requireOwner, formHandler.saveAnswers);
