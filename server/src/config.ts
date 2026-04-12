import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 4000),
  clientUrl: process.env.CLIENT_URL,
  mongoUri: process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/fintech-dashboard",
  jwtSecret: process.env.JWT_SECRET ?? "development-secret",
  cookieName: "fintrack_token",
  isProduction: process.env.NODE_ENV === "production",
  cookieDomain: process.env.COOKIE_DOMAIN,
  cookieSameSite: (process.env.COOKIE_SAME_SITE === "none" ? "none" : "lax") as "none" | "lax",
};
