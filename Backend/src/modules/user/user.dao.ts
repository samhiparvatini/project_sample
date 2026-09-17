import { QueryTypes, type Sequelize } from 'sequelize';
import type { CreateUserRow, UserRow, UserLoginRow } from './user.model.js';

const publicColumns = `"Id" AS user_id, "First Name" AS first_name,
    "Last Name" AS last_name, "Username" AS user_name`;

export class UserDao {
    constructor(private readonly database: Sequelize) {}

    async createUser(user: CreateUserRow): Promise<UserRow> {
        const rows = await this.database.query<UserRow>(
            `INSERT INTO public."User" ("First Name", "Last Name", "Username", "Password_Hash", "Password_Salt")
             VALUES (:firstName, :lastName, :userName, :passwordHash, :passwordSalt)
             RETURNING ${publicColumns}`,
            {
                replacements: {
                    firstName: user.first_name,
                    lastName: user.last_name,
                    userName: user.user_name,
                    passwordHash: user.passwordHash,
                    passwordSalt: user.passwordSalt
                },
                type: QueryTypes.SELECT
            }
        );
        if (!rows[0]) throw new Error('The database did not return the created user');
        return rows[0];
    }

    async findByUserName(userName: string): Promise<UserLoginRow | null> {
        const rows = await this.database.query<UserLoginRow>(
            `SELECT ${publicColumns}, "Password_Hash" AS password_hash
             FROM public."User" WHERE lower("Username") = lower(:userName) LIMIT 1`,
            { replacements: { userName }, type: QueryTypes.SELECT }
        );
        return rows[0] ?? null;
    }

    async getUserById(userId: number): Promise<UserRow | null> {
        const rows = await this.database.query<UserRow>(
            `SELECT ${publicColumns} FROM public."User" WHERE "Id" = :userId`,
            { replacements: { userId }, type: QueryTypes.SELECT }
        );
        return rows[0] ?? null;
    }
}
