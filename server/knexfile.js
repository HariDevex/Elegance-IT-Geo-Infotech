import dotenv from "dotenv";
dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.DB_URL;

let client = "pg";
let sslConfig = { rejectUnauthorized: false };

// Use SQLite for local .db files, PostgreSQL for Supabase
if (connectionString && connectionString.includes(".db") && !connectionString.includes("supabase")) {
  client = "better-sqlite3";
  sslConfig = false;
}

const config = {
  development: {
    client,
    connection: connectionString || "./data/elegance.db",
    useNullAsDefault: true,
    migrations: {
      directory: "./migrations",
      extension: "js",
    },
    seeds: {
      directory: "./seeds",
      extension: "js",
    },
  },
  production: {
    client: "pg",
    connection: connectionString || process.env.DATABASE_URL,
    ssl: sslConfig,
    migrations: {
      directory: "./migrations",
      extension: "js",
    },
    pool: { min: 2, max: 10 },
  },
};

export default config;