# Node.js / Angular Application

This project consists of:

* **Frontend:** Angular
* **Backend:** Node.js / Express
* **Database:** PostgreSQL

This guide explains how to clone the project from GitHub, set up the PostgreSQL database, and run the application locally.

---

# Prerequisites

Before running the application, install the following:

* Node.js
* npm
* Angular CLI
* PostgreSQL
* pgAdmin 4
* Git

Verify the installations:

```bash
node --version
npm --version
ng version
git --version
```

Install Angular CLI if needed:

```bash
npm install -g @angular/cli
```

---

# 1. Clone the Repository

Clone the project from GitHub:

```bash
git clone <repository-url>
```

Example:

```bash
git clone https://github.com/username/project_sample.git
```

Navigate into the project:

```bash
cd project_sample
```

A typical project structure may look like:

```text
project_sample/
│
├── frontend/
│   ├── src/
│   ├── angular.json
│   └── package.json
│
├── backend/
│   ├── src/
│   ├── package.json
│   └── .env
│
├── database/
│   └── database.sql
│
├── .gitignore
└── README.md
```

---

# 2. Set Up the Backend

Navigate to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Start the backend.

```bash
npm run dev
```

The backend may then be available at:

```text
http://localhost:3000
```

---

# 3. Set Up the Angular Frontend

Open another terminal.

Navigate to the frontend directory:

```bash
cd project_sample/frontend
```

Install Angular dependencies:

```bash
npm install
```

Start the Angular development server:

```bash
npm start
```

Open the application in your browser:

```text
http://localhost:4200
```

Angular should now communicate with the Node.js backend.

---

# 4. Set Up PostgreSQL Database

Open **pgAdmin 4** and connect to your local PostgreSQL server.

You can either use an existing database or create a new database.

For example:

```text
Database: postgres
Schema: public
```

If creating a separate database:

```sql
CREATE DATABASE project_sample;
```

# 5. Import the Database on Another Computer

After cloning the repository, open pgAdmin.

Create the database if necessary:

```sql
CREATE DATABASE project_sample;
```

Then select the database and open:

**Tools → Query Tool**

Open:

```text
database/database.sql
```

Run the script.

This will recreate the database objects included in the SQL file.

---

# 6. Configure Local Database Connection

Update the backend `.env` file with the local PostgreSQL settings:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=project_sample
DB_USER=postgres
DB_PASSWORD=your_local_postgres_password
```

For a Node.js application using `pg`, the configuration may look similar to:

```typescript
import { Pool } from 'pg';

export const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});
```

---

# 7. Run the Complete Application

You will normally need two terminals.

### Terminal 1 — Backend

```bash
cd backend
npm install
npm run dev
```

Backend:

```text
http://localhost:3000
```

### Terminal 2 — Frontend

```bash
cd frontend
npm install
npm start
```

Frontend:

```text
http://localhost:4200
```

Open the frontend in your browser and test the application.

---

# 10. Recommended `.gitignore`

The project should have a `.gitignore` similar to:

```text
# Dependencies
node_modules/

# Angular
.angular/
dist/

# Environment variables
.env
.env.local
.env.development
.env.production

# Logs
*.log
npm-debug.log*

# IDE
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db

# Database backup files
*.backup
*.dump
```

If `database.sql` is intentionally being stored in GitHub, **do not** add `*.sql` to `.gitignore`.

---

# Quick Start

After cloning the repository:

```bash
git clone <repository-url>
cd project_sample
```

Set up the backend:

```bash
cd backend
npm install
npm run dev
```

In another terminal, start the frontend:

```bash
cd frontend
npm install
npm start
```

Import:

```text
database/database.sql
```

into the local PostgreSQL database using pgAdmin.

Then open:

```text
http://localhost:4200
```

The Angular frontend, Node.js backend, and PostgreSQL database should now be running locally.
