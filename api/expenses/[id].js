import { createApiHandler, parseObjectId, serializeExpense, validateExpense } from "../../lib/api-handlers.js";

export default createApiHandler({
  PUT: async (request, response, database) => {
    const id = parseObjectId(request.query.id);
    const expense = validateExpense(request.body);
    if (!id) return response.status(400).json({ error: "Invalid expense ID." });
    if (!expense) return response.status(400).json({ error: "Enter a title, valid amount, category, and date." });

    const result = await database.collection("expenses").findOneAndUpdate(
      { _id: id },
      { $set: expense },
      { returnDocument: "after" }
    );
    if (!result) return response.status(404).json({ error: "Expense not found." });
    response.status(200).json(serializeExpense(result));
  },
  DELETE: async (request, response, database) => {
    const id = parseObjectId(request.query.id);
    if (!id) return response.status(400).json({ error: "Invalid expense ID." });
    const result = await database.collection("expenses").deleteOne({ _id: id });
    if (!result.deletedCount) return response.status(404).json({ error: "Expense not found." });
    response.status(204).end();
  }
});
