import { app } from "./app.js";
import { bootstrapServer } from "./bootstrap.js";

type VercelRequest = {
  method?: string;
  url?: string;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  bootstrapServer()
    .then(() => {
      app(req as never, res as never);
    })
    .catch((error) => {
      console.error("Failed to handle Vercel request", {
        method: req.method,
        url: req.url,
        error,
      });

      res.status(500).json({ message: "Server failed to start." });
    });
}
