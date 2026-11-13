import "dotenv/config";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import budgetCollection from "../api/budgets.js";
import budgetById from "../api/budgets/[id].js";
import expensesCollection from "../api/expenses.js";
import expenseById from "../api/expenses/[id].js";
import health from "../api/health.js";

const app = express();
const port = Number(process.env.PORT) || 3001;
const rootDir = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json({ limit: "20kb" }));
app.get("/api/health", health);
app.all("/api/expenses", expensesCollection);
app.all("/api/expenses/:id", (request, response) => {
  const apiRequest = Object.create(request);
  apiRequest.query = { ...request.query, id: request.params.id };
  return expenseById(apiRequest, response);
});
app.all("/api/budgets", budgetCollection);
app.all("/api/budgets/:id", (request, response) => {
  const apiRequest = Object.create(request);
  apiRequest.query = { ...request.query, id: request.params.id };
  return budgetById(apiRequest, response);
});

const clientDir = path.resolve(rootDir, "..", "dist");
if (fs.existsSync(path.join(clientDir, "index.html"))) {
  app.use(express.static(clientDir));
  app.get("*", (_request, response) => response.sendFile(path.join(clientDir, "index.html")));
}

app.listen(port, () => {
  console.log(`Pennywise API running at http://localhost:${port}`);
});
