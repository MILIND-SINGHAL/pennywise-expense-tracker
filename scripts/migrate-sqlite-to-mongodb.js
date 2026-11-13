import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs from "sql.js";
import { getDatabase } from "../lib/mongodb.js";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sqlitePath = process.env.SQLITE_PATH || path.join(rootDir, "server", "expenses.db");
const sqliteBytes = await fs.readFile(sqlitePath);
const SQL = await initSqlJs();
const sqlite = new SQL.Database(sqliteBytes);

function readRows(sql) {
  const statement = sqlite.prepare(sql);
  try {
    const rows = [];
    while (statement.step()) rows.push(statement.getAsObject());
    return rows;
  } finally {
    statement.free();
  }
}

const expenses = readRows("SELECT id, title, amount, category, expense_date AS date, note FROM expenses");
const budgets = readRows("SELECT id, category, month, amount FROM budgets");
const database = await getDatabase();
const expenseCollection = database.collection("expenses");
const budgetCollection = database.collection("budgets");
let importedExpenses = 0;
let importedBudgets = 0;

for (const { id, ...expense } of expenses) {
  const legacyId = String(id);
  const existing = await expenseCollection.findOne({
    $or: [
      { legacyId },
      { title: expense.title, amount: expense.amount, category: expense.category, date: expense.date, note: expense.note || "" }
    ]
  });
  if (existing) {
    await expenseCollection.updateOne({ _id: existing._id }, { $set: { legacyId } });
  } else {
    await expenseCollection.insertOne({ ...expense, note: expense.note || "", legacyId, createdAt: new Date() });
    importedExpenses += 1;
  }
}

for (const { id, ...budget } of budgets) {
  const legacyId = String(id);
  const existing = await budgetCollection.findOne({
    $or: [{ legacyId }, { category: budget.category, month: budget.month }]
  });
  if (existing) {
    await budgetCollection.updateOne({ _id: existing._id }, { $set: { legacyId } });
  } else {
    await budgetCollection.insertOne({ ...budget, legacyId });
    importedBudgets += 1;
  }
}

await database.collection("app_meta").updateOne(
  { _id: "sample_data_seeded" },
  { $setOnInsert: { createdAt: new Date(), migratedFromSQLite: true } },
  { upsert: true }
);
sqlite.close();
console.log(`Imported ${importedExpenses} expenses and ${importedBudgets} budgets into MongoDB. The SQLite file was left unchanged.`);
process.exit(0);
