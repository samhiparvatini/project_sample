import { Sequelize } from "sequelize";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Sequelize connection
export const sequelize = new Sequelize(
    process.env.DATABASE_URL!,
    {
        dialect: "postgres",
        logging: false
    }
);

// pg Pool connection
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});