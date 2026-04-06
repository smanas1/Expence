import mongoose from "mongoose";
import { config } from "./config.js";
import { seedDemoUser } from "./lib/seed.js";
let bootstrapPromise = null;
export function bootstrapServer() {
    if (!bootstrapPromise) {
        bootstrapPromise = (async () => {
            if (mongoose.connection.readyState === 0) {
                try {
                    await mongoose.connect(config.mongoUri);
                    console.log(`Connected to MongoDB at ${config.mongoUri}`);
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
                    throw error;
                }
            }
            await seedDemoUser();
        })();
    }
    return bootstrapPromise;
}
