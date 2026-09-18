import { QUESTIONS, type AnswerInput } from './q+a/questions.js';
import type { Request, Response } from 'express';
import { ForeignKeyConstraintError } from 'sequelize';
import type { FormService } from './form.service.js';

function isPositiveId(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 2147483647;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class FormHandler {
    constructor(private readonly formService: FormService) {}

    getAnswers = async (req: Request, res: Response): Promise<void> => {
        const formId = Number(req.params.formId);
        if (!isPositiveId(formId)) {
            res.status(400).json({ message: 'formId must be a positive integer' });
            return;
        }
        try {
            res.json(await this.formService.getAnswers(formId));
        } catch {
            res.status(500).json({ message: 'Unable to load answers' });
        }
    };

    saveAnswers = async (req: Request, res: Response): Promise<void> => {
        const formId = Number(req.params.formId);
        const body: unknown = req.body;
        if (!isPositiveId(formId) || !isRecord(body) || !Array.isArray(body.answers)
            || body.answers.length !== QUESTIONS.length || (body.statusId !== 2 && body.statusId !== 3)) {
            res.status(400).json({ message: 'Provide all question answers and statusId 2 or 3' });
            return;
        }
        const keys = new Set<string>();
        for (const item of body.answers) {
            if (!isRecord(item) || typeof item.questionKey !== 'string'
                || !QUESTIONS.some(q => q.key === item.questionKey) || keys.has(item.questionKey)
                || !(item.answer === null || (typeof item.answer === 'string' && item.answer.length <= 10000))) {
                res.status(400).json({ message: 'Invalid or duplicate question answer' });
                return;
            }
            keys.add(item.questionKey);
        }
        const answers = (body.answers as AnswerInput[]).map(item => ({
            ...item, answer: item.answer === '' ? null : item.answer
        }));
        const tacos = answers.find(item => item.questionKey === 'tacoCount')!.answer;
        const pineapple = answers.find(item => item.questionKey === 'firstSurvey')!.answer;
        const wouldRather = answers.find(item => item.questionKey === 'wouldRather')!.answer;
        if ((pineapple !== null && pineapple !== 'Yes' && pineapple !== 'No')
            || (wouldRather !== null && wouldRather !== 'Spaghetti for Hair' && wouldRather !== 'Waffles for Ears')) {
            res.status(400).json({ message: 'Invalid checkbox answer' });
            return;
        }
        if (tacos !== null && (!/^\d+$/.test(tacos) || !Number.isSafeInteger(Number(tacos)))) {
            res.status(400).json({ message: 'Taco count must be a nonnegative whole number' });
            return;
        }
        if (body.statusId === 3 && answers.find(item => item.questionKey === 'firstSurvey')!.answer !== 'No') {
            res.status(400).json({ message: 'Select No for the pineapple question before completing the form' });
            return;
        }
        try {
            const form = await this.formService.saveAnswers(formId, answers, body.statusId);
            if (!form) {
                res.status(409).json({ message: 'Form is missing, completed, or has not been initialized with questions' });
                return;
            }
            res.json(form);
        } catch {
            res.status(500).json({ message: 'Unable to save answers' });
        }
    };

    getForms = async (_req: Request, res: Response): Promise<void> => {
        try {
            res.json(await this.formService.getForms());
        } catch {
            console.error('Failed to get forms');
            res.status(500).json({ message: 'Failed to get forms' });
        }
    };

    createForm = async (req: Request, res: Response): Promise<void> => {
        const body: unknown = req.body;
        if (!isRecord(body) || !isPositiveId(body.userId)) {
            res.status(400).json({ message: 'userId must be a positive integer' });
            return;
        }
        try {
            res.status(201).json(await this.formService.createForm({ userId: body.userId }));
        } catch (error) {
            if (error instanceof ForeignKeyConstraintError) {
                res.status(400).json({ message: 'The user or initial form status does not exist' });
                return;
            }
            console.error('Failed to create form');
            res.status(500).json({ message: 'Failed to create form' });
        }
    };

    updateFormStatus = async (req: Request, res: Response): Promise<void> => {
        const rawId = req.params.formId;
        const formId = typeof rawId === 'string' && /^\d+$/.test(rawId) ? Number(rawId) : NaN;
        const body: unknown = req.body;
        if (!isPositiveId(formId) || !isRecord(body) || !isPositiveId(body.statusId)) {
            res.status(400).json({ message: 'formId and statusId must be positive integers' });
            return;
        }
        try {
            const form = await this.formService.updateFormStatus(formId, body.statusId);
            if (!form) {
                res.status(404).json({ message: 'Form not found' });
                return;
            }
            res.json(form);
        } catch (error) {
            if (error instanceof ForeignKeyConstraintError) {
                res.status(400).json({ message: 'That form status does not exist' });
                return;
            }
            console.error('Failed to update form status');
            res.status(500).json({ message: 'Failed to update form status' });
        }
    };
}
