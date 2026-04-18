import dotenv from "dotenv";
dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.DB_URL;

const config = {
  development: {
    client: "better-sqlite3",
    connection: "./data/elegance.db",
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
    connection: connectionString,
    ssl: { rejectUnauthorized: false },
    migrations: {
      directory: "./migrations",
      extension: "js",
    },
    pool: { min: 2, max: 10 },
  },
};

export default config;