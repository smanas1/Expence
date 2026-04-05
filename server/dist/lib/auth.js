import jwt from "jsonwebtoken";
import { config } from "../config.js";
export function signJwt(userId) {
    return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: "7d" });
}
export function verifyJwt(token) {
    return jwt.verify(token, config.jwtSecret);
}
