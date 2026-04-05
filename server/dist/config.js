import dotenv from "dotenv";
dotenv.config();
export const config = {
    port: Number(process.env.PORT ?? 4000),
    clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
    mongoUri: process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/fintech-dashboard",
    jwtSecret: process.env.JWT_SECRET ?? "development-secret",
    cookieName: "fintrack_token",
};
