import knex from "knex";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import knexConfig from "../knexfile.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const env = process.env.NODE_ENV || "production";
const db = knex(knexConfig[env]);

export default db;