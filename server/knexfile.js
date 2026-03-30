import dotenv from "dotenv";
dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.DB_URL;

let client = "pg";
if (connectionString && connectionString.includes(".db")) {
  client = "better-sqlite3";
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
    client,
    connection: connectionString || "./data/elegance.db",
    ssl: client === "pg" ? { rejectUnauthorized: false } : false,
    migrations: {
      directory: "./migrations",
      extension: "js",
    },
    pool: client === "pg" ? { min: 2, max: 10 } : undefined,
  },
};

export default config;
