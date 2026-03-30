import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

export const config = {
  JWT_SECRET: process.env.JWT_SECRET || "elegance_ems_super_secret_key_2024_production_minimum_32_chars",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  PORT: process.env.PORT || 443,
  HOST: process.env.HOST || "0.0.0.0",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5000",
  DATABASE_URL: process.env.DATABASE_URL || process.env.DB_URL,
  REDIS_URL: process.env.REDIS_URL,
  SENTRY_DSN: process.env.SENTRY_DSN,
};

export default config;
