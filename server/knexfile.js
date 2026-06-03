import dotenv from "dotenv";
dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.DB_URL;

const pgConfig = (conn) => ({
  client: "pg",
  connection: conn,
  ssl: { rejectUnauthorized: false },
  migrations: { directory: "./migrations", extension: "js" },
  pool: { min: 2, max: 10 },
});

const sqliteConfig = {
  client: "better-sqlite3",
  connection: "./data/elegance.db",
  useNullAsDefault: true,
  migrations: { directory: "./migrations", extension: "js" },
  seeds: { directory: "./seeds", extension: "js" },
};

const config = {
  development: connectionString ? pgConfig(connectionString) : sqliteConfig,
  production: pgConfig(connectionString),
};

export default config;