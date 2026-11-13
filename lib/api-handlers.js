import { ObjectId } from "mongodb";
import { categories, ensureSampleData, getDatabase } from "./mongodb.js";

export function createApiHandler(methodHandlers) {
  return async function apiHandler(request, response) {
    try {
      const handler = methodHandlers[request.method];
      if (!handler) {
        response.setHeader("Allow", Object.keys(methodHandlers).join(", "));
        return response.status(405).json({ error: "Method not allowed." });
      }
      const database = await getDatabase();
      await ensureSampleData(database);
      await handler(request, response, database);
    } catch (error) {
      console.error("API request failed:", error);
      response.status(500).json({
        error: process.env.NODE_ENV === "production"
          ? "The request could not be completed. Check the server configuration."
          : error.message
      });
    }
  };
}

export function validateExpense(body) {
  if (!body || typeof body !== "object") return null;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const amount = Number(body.amount);
  const category = body.category;
  const date = body.date;
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) : "";
  const parsedDate = typeof date === "string" ? new Date(`${date}T00:00:00.000Z`) : null;

  if (
    !title ||
    title.length > 80 ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 1_000_000_000 ||
    !categories.has(category) ||
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) return null;
  return { title, amount: Math.round(amount * 100) / 100, category, date, note };
}

export function validateBudget(body) {
  if (!body || typeof body !== "object") return null;
  const amount = Number(body.amount);
  if (
    !categories.has(body.category) ||
    typeof body.month !== "string" ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(body.month) ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 1_000_000_000
  ) return null;
  return { category: body.category, month: body.month, amount: Math.round(amount * 100) / 100 };
}

export function parseObjectId(value) {
  return typeof value === "string" && ObjectId.isValid(value) ? new ObjectId(value) : null;
}

export function serializeExpense({ _id, ...expense }) {
  return { id: _id.toHexString(), ...expense };
}

export function serializeBudget({ _id, ...budget }) {
  return { id: _id.toHexString(), ...budget };
}
