import { createApiHandler, serializeBudget, validateBudget } from "../lib/api-handlers.js";

export default createApiHandler({
  GET: async (_request, response, database) => {
    const budgets = await database.collection("budgets").find({}).sort({ category: 1 }).toArray();
    response.status(200).json(budgets.map(serializeBudget));
  },
  POST: async (request, response, database) => {
    const budget = validateBudget(request.body);
    if (!budget) return response.status(400).json({ error: "Enter a valid category, month, and budget amount." });
    try {
      const result = await database.collection("budgets").insertOne(budget);
      response.status(201).json(serializeBudget({ _id: result.insertedId, ...budget }));
    } catch (error) {
      if (error.code === 11000) return response.status(409).json({ error: "A budget already exists for this category and month." });
      throw error;
    }
  }
});
