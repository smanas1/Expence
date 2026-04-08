import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { config } from "./config.js";
import { seedDemoUser } from "./lib/seed.js";
let bootstrapPromise = null;
let memoryServer = null;
async function connectToMongo(uri) {
    await mongoose.connect(uri);
    console.log(`Connected to MongoDB at ${uri}`);
}
export function bootstrapServer() {
    if (!bootstrapPromise) {
        bootstrapPromise = (async () => {
            if (mongoose.connection.readyState === 0) {
                try {
                    await connectToMongo(config.mongoUri);
                }
                catch (error) {
                    console.error("Failed to connect to MongoDB.");
                    if (error &&
                        typeof error === "object" &&
                        "code" in error &&
                        (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") &&
                        (config.mongoUri.startsWith("mongodb+srv://") || config.mongoUri.includes(".mongodb.net"))) {
                        console.error("Atlas DNS lookup failed in Node. Use the standard mongodb:// Atlas connection string instead of mongodb+srv:// for this environment.");
                    }
                    const canUseMemoryFallback = config.useMemoryMongoFallback &&
                        !config.isProduction &&
                        config.mongoUri === "mongodb://127.0.0.1:27017/fintech-dashboard";
                    if (!canUseMemoryFallback) {
                        throw error;
                    }
                    console.warn("Falling back to an in-memory MongoDB instance for local development.");
                    memoryServer = await MongoMemoryServer.create({
                        instance: { dbName: "fintech-dashboard" },
                    });
                    await connectToMongo(memoryServer.getUri());
                }
            }
            await seedDemoUser();
        })();
    }
    return bootstrapPromise;
}
