import fs from "node:fs/promises";
import path from "node:path";
import dns from "node:dns";
import { fileURLToPath } from "node:url";
import { MongoClient, ObjectId } from "mongodb";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Ignore if custom DNS fails
}

export const categories = new Set([
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Health",
  "Entertainment",
  "Other"
]);

const globalMongoKey = "__pennywiseMongoClientPromise";
const globalFallbackKey = "__pennywiseFallbackDatabase";
let clientPromise = globalThis[globalMongoKey];

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const storageDir = path.resolve(rootDir, "..", "data");
const storagePath = path.join(storageDir, "pennywise-demo.json");

export async function getDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    if (!globalThis[globalFallbackKey]) {
      globalThis[globalFallbackKey] = await createFallbackDatabase();
      console.log("MongoDB not configured; using local demo storage at data/pennywise-demo.json");
    }
    const database = globalThis[globalFallbackKey];
    await ensureIndexes(database);
    return database;
  }

  try {
    if (!clientPromise) {
      const client = new MongoClient(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 5000 });
      clientPromise = client.connect().catch((error) => {
        clientPromise = undefined;
        globalThis[globalMongoKey] = undefined;
        throw error;
      });
      globalThis[globalMongoKey] = clientPromise;
    }

    const client = await clientPromise;
    const database = client.db(process.env.MONGODB_DB || "pennywise");
    await ensureIndexes(database);
    return database;
  } catch (error) {
    console.warn("MongoDB connection failed, falling back to local demo storage:", error.message);
    if (!globalThis[globalFallbackKey]) {
      globalThis[globalFallbackKey] = await createFallbackDatabase();
    }
    const fallbackDb = globalThis[globalFallbackKey];
    await ensureIndexes(fallbackDb);
    return fallbackDb;
  }
}

let indexesPromise;

async function ensureIndexes(database) {
  if (!indexesPromise) {
    indexesPromise = Promise.all([
      database.collection("expenses").createIndex({ date: -1, _id: -1 }),
      database.collection("expenses").createIndex({ demoKey: 1 }, { unique: true, sparse: true }),
      database.collection("expenses").createIndex({ legacyId: 1 }, { unique: true, sparse: true }),
      database.collection("budgets").createIndex({ category: 1, month: 1 }, { unique: true }),
      database.collection("budgets").createIndex({ legacyId: 1 }, { unique: true, sparse: true }),
      database.collection("app_meta").createIndex({ createdAt: 1 })
    ]).catch((error) => {
      indexesPromise = undefined;
      throw error;
    });
  }
  await indexesPromise;
}

async function createFallbackDatabase() {
  const store = await readFallbackStore();
  return {
    collection(name) {
      return new FallbackCollection(store, name);
    }
  };
}

async function readFallbackStore() {
  try {
    await fs.mkdir(storageDir, { recursive: true });
    const raw = await fs.readFile(storagePath, "utf8");
    if (!raw.trim()) return { expenses: [], budgets: [], app_meta: [] };
    const parsed = JSON.parse(raw);
    return {
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      budgets: Array.isArray(parsed.budgets) ? parsed.budgets : [],
      app_meta: Array.isArray(parsed.app_meta) ? parsed.app_meta : []
    };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return { expenses: [], budgets: [], app_meta: [] };
  }
}

async function persistFallbackStore(store) {
  await fs.mkdir(storageDir, { recursive: true });
  await fs.writeFile(storagePath, JSON.stringify(store, null, 2), "utf8");
}

class FallbackCollection {
  constructor(store, name) {
    this.store = store;
    this.name = name;
  }

  async createIndex() {
    return null;
  }

  async find(filter = {}) {
    return new FallbackCursor(this.store[this.name] || [], filter);
  }

  async findOne(filter = {}) {
    return this.store[this.name]?.find((document) => matchesFilter(document, filter)) ?? null;
  }

  async insertOne(document) {
    const entry = { ...document, _id: document._id ?? new ObjectId() };
    this.store[this.name] ??= [];
    this.store[this.name].push(entry);
    await persistFallbackStore(this.store);
    return { insertedId: entry._id };
  }

  async updateOne(filter, update, options = {}) {
    const collection = this.store[this.name] ?? [];
    const existingIndex = collection.findIndex((document) => matchesFilter(document, filter));
    if (existingIndex === -1) {
      if (options.upsert) {
        const nextDocument = { _id: new ObjectId(), ...applyUpdate({}, update) };
        collection.push(nextDocument);
        await persistFallbackStore(this.store);
        return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
      }
      return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
    }

    const nextDocument = applyUpdate(collection[existingIndex], update);
    collection[existingIndex] = nextDocument;
    await persistFallbackStore(this.store);
    return { matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
  }

  async findOneAndUpdate(filter, update, options = {}) {
    const collection = this.store[this.name] ?? [];
    const index = collection.findIndex((document) => matchesFilter(document, filter));
    if (index === -1) {
      if (options.returnDocument === "after" && update.$setOnInsert) {
        const nextDocument = { _id: new ObjectId(), ...update.$setOnInsert };
        collection.push(nextDocument);
        await persistFallbackStore(this.store);
        return nextDocument;
      }
      return null;
    }

    const nextDocument = applyUpdate(collection[index], update);
    collection[index] = nextDocument;
    await persistFallbackStore(this.store);
    return options.returnDocument === "after" ? nextDocument : collection[index];
  }

  async deleteOne(filter) {
    const collection = this.store[this.name] ?? [];
    const index = collection.findIndex((document) => matchesFilter(document, filter));
    if (index === -1) {
      return { deletedCount: 0 };
    }
    collection.splice(index, 1);
    await persistFallbackStore(this.store);
    return { deletedCount: 1 };
  }

  async bulkWrite(operations, options = {}) {
    const collection = this.store[this.name] ?? [];
    const results = { insertedCount: 0, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
    for (const operation of operations) {
      const { filter = {}, update = {}, upsert = false } = operation.updateOne ?? operation;
      const existingIndex = collection.findIndex((document) => matchesFilter(document, filter));
      if (existingIndex === -1) {
        if (upsert) {
          const nextDocument = { _id: new ObjectId(), ...applyUpdate({}, update) };
          collection.push(nextDocument);
          results.upsertedCount += 1;
          results.insertedCount += 1;
        }
        continue;
      }
      const nextDocument = applyUpdate(collection[existingIndex], update);
      collection[existingIndex] = nextDocument;
      results.matchedCount += 1;
      results.modifiedCount += 1;
    }
    await persistFallbackStore(this.store);
    return results;
  }
}

class FallbackCursor {
  constructor(collection, filter) {
    this.collection = collection;
    this.filter = filter;
    this.sortSpec = null;
  }

  sort(spec) {
    this.sortSpec = spec;
    return this;
  }

  async toArray() {
    const matches = this.collection.filter((document) => matchesFilter(document, this.filter));
    if (!this.sortSpec) return matches;

    const entries = [...matches];
    const [key, direction] = Object.entries(this.sortSpec)[0];
    entries.sort((left, right) => {
      const leftValue = left[key] ?? "";
      const rightValue = right[key] ?? "";
      const result = String(leftValue).localeCompare(String(rightValue));
      return direction === -1 ? -result : result;
    });
    return entries;
  }
}

function matchesFilter(document, filter = {}) {
  if (!filter || Object.keys(filter).length === 0) return true;
  return Object.entries(filter).every(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (value.$gte !== undefined && document[key] < value.$gte) return false;
      if (value.$lt !== undefined && document[key] >= value.$lt) return false;
      if (value.$in !== undefined && !value.$in.includes(document[key])) return false;
      return true;
    }
    return document[key] === value;
  });
}

function applyUpdate(document, update = {}) {
  const next = { ...(document ?? {}) };
  if (update.$set) Object.assign(next, update.$set);
  if (update.$setOnInsert) Object.assign(next, update.$setOnInsert);
  return next;
}

export async function ensureSampleData(database) {
  const metadata = database.collection("app_meta");
  if (await metadata.findOne({ _id: "sample_data_seeded" })) return;

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const samples = [
    ["Morning coffee", 5.75, "Food", -1, "Flat white and a pastry"],
    ["Metro card", 24, "Transport", -2, "Weekly commute top-up"],
    ["Market groceries", 68.42, "Food", -3, "Fresh produce and pantry staples"],
    ["Notebook & pens", 18.9, "Shopping", -5, "A few desk essentials"],
    ["Electricity bill", 74.3, "Bills", -7, "Monthly utility bill"],
    ["Lunch with friends", 32.5, "Food", -9, "Weekend catch-up"],
    ["Pharmacy", 14.25, "Health", -11, "Everyday essentials"],
    ["Movie night", 28, "Entertainment", -12, "Tickets and snacks"]
  ];

  const expenses = samples.map(([title, amount, category, offset, note], index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const expenseDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return {
      updateOne: {
        filter: { demoKey: `sample-expense-${index + 1}` },
        update: {
          $setOnInsert: { title, amount, category, date: expenseDate, note, demoKey: `sample-expense-${index + 1}` }
        },
        upsert: true
      }
    };
  });
  await bulkSeed(database.collection("expenses"), expenses);

  const sampleBudgets = [["Food", 350], ["Transport", 120], ["Shopping", 220], ["Bills", 180], ["Health", 100]];
  const budgets = sampleBudgets.map(([category, amount]) => ({
    updateOne: {
      filter: { category, month },
      update: { $setOnInsert: { category, month, amount } },
      upsert: true
    }
  }));
  await bulkSeed(database.collection("budgets"), budgets);
  await metadata.updateOne(
    { _id: "sample_data_seeded" },
    { $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );
}

async function bulkSeed(collection, operations) {
  try {
    await collection.bulkWrite(operations, { ordered: false });
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
}
