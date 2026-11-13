import { createApiHandler, parseObjectId, serializeBudget, validateBudget } from "../../lib/api-handlers.js";

export default createApiHandler({
  PUT: async (request, response, database) => {
    const id = parseObjectId(request.query.id);
    const budget = validateBudget(request.body);
    if (!id) return response.status(400).json({ error: "Invalid budget ID." });
    if (!budget) return response.status(400).json({ error: "Enter a valid category, month, and budget amount." });

    try {
      const result = await database.collection("budgets").findOneAndUpdate(
        { _id: id },
        { $set: budget },
        { returnDocument: "after" }
      );
      if (!result) return response.status(404).json({ error: "Budget not found." });
      response.status(200).json(serializeBudget(result));
    } catch (error) {
      if (error.code === 11000) return response.status(409).json({ error: "A budget already exists for this category and month." });
      throw error;
    }
  },
  DELETE: async (request, response, database) => {
    const id = parseObjectId(request.query.id);
    if (!id) return response.status(400).json({ error: "Invalid budget ID." });
    const result = await database.collection("budgets").deleteOne({ _id: id });
    if (!result.deletedCount) return response.status(404).json({ error: "Budget not found." });
    response.status(204).end();
  }
});
