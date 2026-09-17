import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { QueryTypes } from 'sequelize';
import { sequelize } from './db.js';
import { userRouter } from './modules/user/user.routes.js';
import { colorRouter } from './modules/form/colors/colors.routes.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors({
    origin: 'http://localhost:4200',
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/users', userRouter);
app.use('/api/colors', colorRouter);

app.get('/', (_req, res) => {
    res.json({
        message: 'Backend is running',
        endpoints: ['/api/hello', '/api/db-test', '/api/users/:userId']
    });
});

app.get('/api/hello', (_req, res) => {
    res.json({
        message: 'Hello from Node.js backend'
    });
});

app.get('/api/db-test', async (_req, res) => {
    try {
        const rows = await sequelize.query(
            'SELECT NOW() AS current_time',
            { type: QueryTypes.SELECT }
        );

        res.json({
            connected: true,
            result: rows[0]
        });
    } catch (error) {
        console.error('Database query failed:', error);

        res.status(500).json({
            connected: false,
            message: 'Database query failed'
        });
    }
});

async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('Connected to PostgreSQL');

        app.listen(PORT, () => {
            console.log(`Server running at ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to connect to PostgreSQL:', error);
        process.exit(1);
    }
}

void startServer();
