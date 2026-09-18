import type { AnswerInput } from './q+a/questions.js';
import type { ResponseData } from './q+a/response.model.js';
import type { FormDao } from './form.dao.js';
import type { CreateFormInput, FormData, FormListRow } from './form.model.js';

export class FormService {
    constructor(private readonly formDao: FormDao) {}

    async isOwner(formId: number, userId: number): Promise<boolean> {
        return this.formDao.isOwner(formId, userId);
    }

    async getForms(): Promise<FormListRow[]> {
        return this.formDao.getForms();
    }

    async createForm(input: CreateFormInput): Promise<FormData> {
        return this.formDao.createForm(input.userId);
    }

    async getAnswers(formId: number): Promise<ResponseData[]> {
        return this.formDao.getAnswers(formId);
    }

    async saveAnswers(formId: number, answers: AnswerInput[], statusId: 2 | 3): Promise<FormData | null> {
        return this.formDao.saveAnswers(formId, answers, statusId);
    }

    async updateFormStatus(formId: number, statusId: number): Promise<FormData | null> {
        return this.formDao.updateFormStatus(formId, statusId);
    }
}
