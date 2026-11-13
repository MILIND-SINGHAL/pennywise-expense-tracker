import { createApiHandler, serializeExpense, validateExpense } from "../lib/api-handlers.js";
import { categories } from "../lib/mongodb.js";

export default createApiHandler({
  GET: async (request, response, database) => {
    const filter = {};
    if (typeof request.query.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(request.query.month)) {
      filter.date = {
        $gte: `${request.query.month}-01`,
        $lt: nextMonth(request.query.month)
      };
    }
    if (typeof request.query.category === "string" && categories.has(request.query.category)) {
      filter.category = request.query.category;
    }
    const expenses = await database.collection("expenses")
      .find(filter)
      .sort({ date: -1, _id: -1 })
      .toArray();
    response.status(200).json(expenses.map(serializeExpense));
  },
  POST: async (request, response, database) => {
    const expense = validateExpense(request.body);
    if (!expense) return response.status(400).json({ error: "Enter a title, valid amount, category, and date." });
    const result = await database.collection("expenses").insertOne({
      ...expense,
      createdAt: new Date()
    });
    response.status(201).json(serializeExpense({ _id: result.insertedId, ...expense }));
  }
});

function nextMonth(value) {
  const [year, month] = value.split("-").map(Number);
  return month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
}
