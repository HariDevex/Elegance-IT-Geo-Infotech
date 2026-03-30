import jwt from "jsonwebtoken";
import { config } from "../config/appConfig.js";
import db from "../config/database.js";
import crypto from "crypto";

const tokenBlacklist = new Map();

export const blacklistToken = async (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return false;

    const ttl = decoded.exp * 1000 - Date.now();
    if (ttl <= 0) return false;

    const hours = Math.ceil(ttl / (1000 * 60 * 60));
    const tokenHash = hashToken(token);

    await db("token_blacklist").insert({
      token_hash: tokenHash,
      expires_at: new Date(decoded.exp * 1000),
      blacklisted_at: new Date(),
    });

    tokenBlacklist.set(tokenHash, true);

    return true;
  } catch (error) {
    console.error("Error blacklisting token:", error);
    return false;
  }
};

export const isTokenBlacklisted = async (token) => {
  const tokenHash = hashToken(token);

  if (tokenBlacklist.has(tokenHash)) {
    return true;
  }

  try {
    const result = await db("token_blacklist")
      .where("token_hash", tokenHash)
      .where("expires_at", ">", new Date())
      .first();

    if (result) {
      tokenBlacklist.set(tokenHash, true);
      return true;
    }
  } catch (error) {
    console.error("Error checking token blacklist:", error);
  }

  return false;
};

export const cleanupExpiredTokens = async () => {
  try {
    const deleted = await db("token_blacklist")
      .where("expires_at", "<", new Date())
      .del();

    if (deleted > 0) {
      console.log(`Cleaned up ${deleted} expired blacklisted tokens`);
    }

    for (const [hash] of tokenBlacklist) {
      const exists = await db("token_blacklist")
        .where("token_hash", hash)
        .where("expires_at", ">", new Date())
        .first();
      
      if (!exists) {
        tokenBlacklist.delete(hash);
      }
    }
  } catch (error) {
    console.error("Error cleaning up tokens:", error);
  }
};

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

export default {
  blacklistToken,
  isTokenBlacklisted,
  cleanupExpiredTokens,
};
