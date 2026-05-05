import mongoose from "mongoose";

import { assertRuntimeConfig, config } from "./config.js";
import { ensureRecordsBackfilled } from "./lib/records.js";
import { seedDemoUser } from "./lib/seed.js";

let bootstrapPromise: Promise<void> | null = null;

async function connectToMongo(uri: string) {
  await mongoose.connect(uri);
  console.log(`Connected to MongoDB at ${uri}`);
}

export function bootstrapServer() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      assertRuntimeConfig();

      if (mongoose.connection.readyState === 0) {
        try {
          await connectToMongo(config.mongoUri);
        } catch (error) {
          console.error("Failed to connect to MongoDB.");
          if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") &&
            (config.mongoUri.startsWith("mongodb+srv://") || config.mongoUri.includes(".mongodb.net"))
          ) {
            console.error(
              "Atlas DNS lookup failed in Node. Use the standard mongodb:// Atlas connection string instead of mongodb+srv:// for this environment.",
            );
          }

          throw error;
        }
      }

      await seedDemoUser();
      await ensureRecordsBackfilled();
    })();
  }

  return bootstrapPromise;
}
