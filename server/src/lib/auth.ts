import jwt from "jsonwebtoken";

import { config } from "../config.js";

export function signJwt(userId: string) {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: "7d" });
}

export function verifyJwt(token: string) {
  return jwt.verify(token, config.jwtSecret) as { sub: string };
}
