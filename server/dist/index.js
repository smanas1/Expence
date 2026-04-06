import { app } from "./app.js";
import { bootstrapServer } from "./bootstrap.js";
import { config } from "./config.js";
async function start() {
    await bootstrapServer();
    app.listen(config.port, () => {
        console.log(`API listening on http://localhost:${config.port}`);
    });
}
start().catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
});
