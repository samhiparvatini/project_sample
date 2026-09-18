import { QUESTIONS, type AnswerInput } from '../src/modules/form/q+a/questions.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { QueryTypes } from 'sequelize';
import { FormDao } from '../src/modules/form/form.dao.js';
import { FormService } from '../src/modules/form/form.service.js';

test('form insert and status updates round-trip in a rolled-back transaction', { skip: process.env.RUN_DB_TESTS !== '1' }, async () => {
    const { sequelize } = await import('../src/db.js');
    const transaction = await sequelize.transaction();
    try {
        const database = new Proxy(sequelize, {
            get(target, key) {
                if (key === 'query') return (sql: string, options: object) => target.query(sql, { ...options, transaction });
                return Reflect.get(target, key);
            }
        });
        const users = await database.query<{ id: number }>(
            `INSERT INTO public."User" ("First Name", "Last Name", "Username")
             VALUES ('Form', 'Test', :username) RETURNING "Id" AS id`,
            { replacements: { username: `form-test-${randomUUID()}` }, type: QueryTypes.SELECT }
        );
        const service = new FormService(new FormDao(database));
        const form = await service.createForm({ userId: users[0]!.id });
        assert.equal(form.userId, users[0]!.id);
        assert.equal(form.statusId, 1);
        assert.ok(form.formId > 0);
        assert.match(form.dateCreated, /^\d{4}-\d{2}-\d{2}$/);
        const initialAnswers = await service.getAnswers(form.formId);
        assert.equal(await service.updateFormStatus(form.formId, 3), null);
        assert.equal(initialAnswers.length, 7);
        assert.ok(initialAnswers.every(answer => answer.answer === null));
        assert.equal(new Set(initialAnswers.map(answer => answer.questionKey)).size, 7);
        const answers: AnswerInput[] = QUESTIONS.map(q => ({ questionKey: q.key, answer: null }));
        answers.find(q => q.questionKey === 'tacoCount')!.answer = '0';
        answers.find(q => q.questionKey === 'firstSurvey')!.answer = 'No';
        await service.saveAnswers(form.formId, answers, 2);
        assert.equal((await service.getAnswers(form.formId)).find(q => q.questionKey === 'tacoCount')!.answer, '0');
        answers.find(q => q.questionKey === 'tacoCount')!.answer = null;
        await service.saveAnswers(form.formId, answers, 2);
        assert.equal((await service.getAnswers(form.formId)).find(q => q.questionKey === 'tacoCount')!.answer, null);
        const reopened = await service.createForm({ userId: users[0]!.id });
        assert.equal(reopened.formId, form.formId);
        assert.equal((await service.getAnswers(form.formId)).length, 7);
        assert.equal((await service.getAnswers(form.formId)).find(q => q.questionKey === 'firstSurvey')!.answer, 'No');
        const updated = await service.updateFormStatus(form.formId, 2);
        assert.deepEqual(updated, { ...form, statusId: 2 });
        assert.equal(await service.saveAnswers(form.formId, answers, 3), null);
        const completeValues: Record<string, string> = {
            color: 'Red', firstSurvey: 'No', wouldRather: 'Spaghetti for Hair',
            animalRoommate: 'Tiger', tacoCount: '0', incon: 'Wet socks', feedback: 'Great'
        };
        for (const answer of answers) answer.answer = completeValues[answer.questionKey]!;
        assert.deepEqual(await service.saveAnswers(form.formId, answers, 3), { ...form, statusId: 3 });
        assert.equal(await service.saveAnswers(form.formId, answers, 2), null);
        const listed = (await service.getForms()).find(item => item.formId === form.formId);
        assert.equal(listed?.userId, users[0]!.id);
        assert.ok(listed?.userName.startsWith('form-test-'));
        assert.equal(listed?.statusName, 'Completed');
        await database.query('DELETE FROM public."Questions" WHERE "Form" = :id', { replacements: { id: form.formId } });
        await database.query('DELETE FROM public."Form" WHERE "Id" = :id', { replacements: { id: form.formId } });
        assert.equal(await service.updateFormStatus(form.formId, 2), null);
        await assert.rejects(service.createForm({ userId: -1 }));
    } finally {
        await transaction.rollback();
        await sequelize.close();
    }
});
