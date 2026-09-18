import { QUESTIONS, type AnswerInput } from './q+a/questions.js';
import type { ResponseData } from './q+a/response.model.js';
import { QueryTypes, type Sequelize } from 'sequelize';
import type { FormData, FormListRow } from './form.model.js';

const formColumns = `"Id" AS "formId", "User" AS "userId",
    "Date_Created" AS "dateCreated", "Status_Id" AS "statusId"`;

export class FormDao {
    constructor(private readonly database: Sequelize) {}

    async getForms(): Promise<FormListRow[]> {
        return this.database.query<FormListRow>(
            `SELECT f."Id" AS "formId", f."User" AS "userId",
                    f."Date_Created" AS "dateCreated", f."Status_Id" AS "statusId",
                    u."Username" AS "userName", s."Status" AS "statusName"
             FROM public."Form" f
             JOIN public."User" u ON u."Id" = f."User"
             LEFT JOIN public."Status" s ON s."Id" = f."Status_Id"
             ORDER BY f."Date_Created" DESC NULLS LAST, f."Id" DESC`,
            { type: QueryTypes.SELECT }
        );
    }

    async createForm(userId: number): Promise<FormData> {
        const rows = await this.database.query<FormData>(
            `WITH new_form AS (
                INSERT INTO public."Form" ("User", "Date_Created", "Status_Id")
                VALUES (:userId, CURRENT_DATE, 1)
                ON CONFLICT ("User") DO UPDATE SET "User" = EXCLUDED."User"
                RETURNING *
             ), new_questions AS (
                INSERT INTO public."Questions" ("Form", "Key", "Question", "Answer")
                SELECT f."Id", q.key, q.question, NULL
                FROM new_form f CROSS JOIN jsonb_to_recordset(CAST(:questions AS jsonb)) AS q(key text, question text)
                ON CONFLICT ("Form", "Key") DO NOTHING
                RETURNING "Id"
             )
             SELECT ${formColumns} FROM new_form`,
            { replacements: { userId, questions: JSON.stringify(QUESTIONS) }, type: QueryTypes.SELECT }
        );
        if (!rows[0]) throw new Error('The database did not return the created form');
        return rows[0];
    }

    async getAnswers(formId: number): Promise<ResponseData[]> {
        return this.database.query<ResponseData>(
            `SELECT "Id" AS id, "Form" AS "formId", "Key" AS "questionKey",
                    "Question" AS question, "Answer" AS answer
             FROM public."Questions" WHERE "Form" = :formId ORDER BY "Id"`,
            { replacements: { formId }, type: QueryTypes.SELECT }
        );
    }

    async saveAnswers(formId: number, answers: AnswerInput[], statusId: 2 | 3): Promise<FormData | null> {
        const rows = await this.database.query<FormData>(
            `WITH payload AS (
                SELECT * FROM jsonb_to_recordset(CAST(:answers AS jsonb)) AS p("questionKey" text, answer text)
             ), locked_form AS (
                SELECT "Id" FROM public."Form"
                WHERE "Id" = :formId AND "Status_Id" <> 3 FOR UPDATE
             ), valid_form AS (
                SELECT * FROM locked_form f WHERE
                  (SELECT count(*) FROM public."Questions" q JOIN payload p ON q."Key" = p."questionKey"
                   WHERE q."Form" = f."Id") = (SELECT count(*) FROM payload)
             ), saved_answers AS (
                UPDATE public."Questions" q SET "Answer" = p.answer
                FROM payload p, valid_form f
                WHERE q."Form" = f."Id" AND q."Key" = p."questionKey" RETURNING q."Id"
             )
             UPDATE public."Form" SET "Status_Id" = :statusId
             WHERE "Id" IN (SELECT "Id" FROM valid_form)
               AND (SELECT count(*) FROM saved_answers) = (SELECT count(*) FROM payload)
             RETURNING ${formColumns}`,
            { replacements: { formId, answers: JSON.stringify(answers), statusId }, type: QueryTypes.SELECT }
        );
        return rows[0] ?? null;
    }

    async updateFormStatus(formId: number, statusId: number): Promise<FormData | null> {
        const rows = await this.database.query<FormData>(
            `UPDATE public."Form" SET "Status_Id" = :statusId
             WHERE "Id" = :formId RETURNING ${formColumns}`,
            { replacements: { formId, statusId }, type: QueryTypes.SELECT }
        );
        return rows[0] ?? null;
    }
}
