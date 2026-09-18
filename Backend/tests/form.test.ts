import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { FormHandler } from '../src/modules/form/form.handler.js';
import type { FormService } from '../src/modules/form/form.service.js';

function response() {
    const result = { status: 200, body: undefined as unknown };
    const res = {
        status(code: number) { result.status = code; return this; },
        json(body: unknown) { result.body = body; return this; }
    } as Response;
    return { result, res };
}

test('form handlers reject invalid IDs before calling the service', async () => {
    const handler = new FormHandler({} as FormService);
    for (const body of [null, {}, { userId: -1 }, { userId: '1' }, { userId: 1.5 }, { userId: 2147483648 }]) {
        const { res, result } = response();
        await handler.createForm({ body } as Request, res);
        assert.equal(result.status, 400);
    }
    for (const formId of ['abc', '0', '-1', '1.5', '1e2']) {
        const { res, result } = response();
        await handler.updateFormStatus({ params: { formId }, body: { statusId: 2 } } as unknown as Request, res);
        assert.equal(result.status, 400);
    }
    const { res, result } = response();
    await handler.updateFormStatus({ params: { formId: '1' }, body: { statusId: '2' } } as unknown as Request, res);
    assert.equal(result.status, 400);
});

test('create returns 201 and a missing form returns 404', async () => {
    const row = { formId: 5, userId: 7, dateCreated: '2026-09-17', statusId: 1 };
    const handler = new FormHandler({
        async createForm(input: { userId: number }) { assert.equal(input.userId, 7); return row; },
        async updateFormStatus() { return null; }
    } as unknown as FormService);
    const created = response();
    await handler.createForm({ body: { userId: 7 } } as Request, created.res);
    assert.equal(created.result.status, 201);
    assert.deepEqual(created.result.body, row);
    const missing = response();
    await handler.updateFormStatus({ params: { formId: '5' }, body: { statusId: 2 } } as unknown as Request, missing.res);
    assert.equal(missing.result.status, 404);
});

test('answer saves reject incomplete, duplicate, and invalid values', async () => {
    const { QUESTIONS } = await import('../src/modules/form/q+a/questions.js');
    const handler = new FormHandler({} as FormService);
    const defaults = QUESTIONS.map(q => ({ questionKey: q.key, answer: null as string | null }));
    const invalidBodies = [
        { answers: [], statusId: 2 },
        { answers: defaults.map(() => defaults[0]), statusId: 2 },
        { answers: defaults.map(q => q.questionKey === 'tacoCount' ? { ...q, answer: '-1' } : q), statusId: 2 },
        { answers: defaults.map(q => q.questionKey === 'firstSurvey' ? { ...q, answer: 'invalid' } : q), statusId: 2 },
        { answers: defaults, statusId: 3 },
    ];
    for (const body of invalidBodies) {
        const { res, result } = response();
        await handler.saveAnswers({ params: { formId: '5' }, body } as unknown as Request, res);
        assert.equal(result.status, 400);
    }
});
