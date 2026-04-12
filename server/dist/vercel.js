import { app } from "./app.js";
import { bootstrapServer } from "./bootstrap.js";
export default async function handler(req, res) {
    try {
        await bootstrapServer();
        return app(req, res);
    }
    catch (error) {
        console.error("Failed to handle Vercel request", {
            method: req.method,
            url: req.url,
            error,
        });
        return res.status(500).json({ message: "Server failed to start." });
    }
}
