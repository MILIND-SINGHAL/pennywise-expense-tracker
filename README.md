# Pennywise Expense Tracker

> **Full Stack Development Project**  
> **Student:** Milind Singhal  
> **UID:** 24BCS11065  

Pennywise is a personal finance and budgeting web application that helps users track expenses, manage monthly budgets, and analyze spending habits. The project is built with Vite + React on the frontend and Express on the backend, with MongoDB as the primary database. To make the app portable and easy to demo on any machine, it also includes a local JSON fallback so it can run without a cloud database or extra setup.

## Features

- Add, edit, and delete expense entries
- Filter expenses by month and category
- Search transactions by title, category, or note
- View monthly totals and category spending summaries
- Manage category budgets and track remaining limits
- Export monthly reports as CSV
- Update user preferences like name and currency
- Run with MongoDB when configured, or with local demo storage if not

## Tech stack

- Frontend: React, Vite, CSS
- Backend: Express.js
- Database: MongoDB (primary), local JSON fallback
- Deployment: Vercel-ready, static build pipeline

## Requirements

- Node.js 18 or newer
- npm
- Optional: MongoDB URI for cloud/database-backed usage

## Run the project anywhere

### Option 1: run locally with no database setup

```bash
npm install
npm run dev
```

This will work without a MongoDB connection. The app automatically stores data in the local demo storage file under `data/pennywise-demo.json`.

### Option 2: run with MongoDB

1. Copy `.env.example` to `.env`
2. Set your MongoDB connection string:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/
MONGODB_DB=pennywise
```

Then run:

```bash
npm run dev
```

The frontend runs on the Vite development server and proxies API requests to the Express backend.

## Production build

```bash
npm run build
npm start
```

If `MONGODB_URI` is not configured, the app still runs using local backup storage to keep demonstrations portable.

## Deployment

The app is ready for Vercel deployment. The `vercel.json` configuration points Vercel to the Vite build output and keeps the API endpoints compatible with the project structure.

## Project structure

```text
.
├── api/
├── data/
├── lib/
├── scripts/
├── server/
├── src/
├── .env.example
├── README.md
├── PROJECT_REPORT.md
├── package.json
├── vercel.json
├── vite.config.js
└── index.html
```

## Notes

- The app was modified to work in shared/demo environments and does not depend only on a local MongoDB setup.
- The fallback storage file allows teammates or teachers to run the project on another machine without changing code.
- If MongoDB is later configured, the application uses it automatically without changing the app logic.
