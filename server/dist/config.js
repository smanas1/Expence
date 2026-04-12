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
    cookieSameSite: (process.env.COOKIE_SAME_SITE === "none" ? "none" : "lax"),
};
export function assertRuntimeConfig() {
    const errors = [];
    if (!process.env.MONGO_URI) {
        errors.push("MONGO_URI is required in deployment environments.");
    }
    if (!process.env.JWT_SECRET) {
        errors.push("JWT_SECRET is required in deployment environments.");
    }
    if (!process.env.CLIENT_URL) {
        errors.push("CLIENT_URL is required in deployment environments.");
    }
    if (errors.length > 0) {
        throw new Error(`Invalid runtime configuration: ${errors.join(" ")}`);
    }
}
