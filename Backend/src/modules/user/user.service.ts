import { hashPassword, verifyPassword } from '../../common/password.helper.js';
import type { UserDao } from './user.dao.js';
import type { CreateUserInput, UserData, UserRow } from './user.model.js';

export class UserService {
    constructor(private readonly userDao: UserDao) {}

    async createUser(input: CreateUserInput): Promise<UserData> {
        const { passwordHash, passwordSalt } = await hashPassword(input.password);
        const row = await this.userDao.createUser({
            first_name: input.firstName,
            last_name: input.lastName,
            user_name: input.userName,
            passwordHash,
            passwordSalt
        });

        return this.mapUser(row);
    }

    async getUserById(userId: number): Promise<UserData | null> {
        const row = await this.userDao.getUserById(userId);
        return row ? this.mapUser(row) : null;
    }

    private mapUser(row: UserRow): UserData {
        // create jwt token with available values like returned properties
        // + token expiration, for 30 minutes from now
        // and add token to the response
        return {
            userId: row.user_id,
            firstName: row.first_name,
            lastName: row.last_name,
            userName: row.user_name
        };
    }

    async login(userName: string, password: string): Promise<UserData | null> {
        const row = await this.userDao.findByUserName(userName);
        if (!row?.password_hash || !(await verifyPassword(row.password_hash, password))) return null;
        return this.mapUser(row);
    }
}
