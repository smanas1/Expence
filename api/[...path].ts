import { app } from "../server/src/app.js";
import { bootstrapServer } from "../server/src/bootstrap.js";

export default async function handler(req: unknown, res: unknown) {
  await bootstrapServer();
  return app(req as never, res as never);
}
