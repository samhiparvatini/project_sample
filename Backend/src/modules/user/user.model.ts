export interface UserData {
    userId: number;
    firstName: string;
    lastName: string;
    userName: string;
}

export interface CreateUserInput {
    firstName: string;
    lastName: string;
    userName: string;
    password: string;
}

export interface CreateUserRow {
    first_name: string;
    last_name: string;
    user_name: string;
    passwordHash: string;
    passwordSalt: string;
}

export interface UserRow {
    user_id: number;
    first_name: string;
    last_name: string;
    user_name: string;
}

export interface UserLoginRow extends UserRow {
    password_hash: string | null;
}
