import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env") });

const connectionString = process.env.DATABASE_URL || process.env.DB_URL;

const sslEnabled = process.env.DB_SSL !== "false";

const pgConfig = (conn) => ({
  client: "pg",
  connection: {
    connectionString: conn,
    ...(sslEnabled ? { ssl: { rejectUnauthorized: false } } : {}),
  },
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
  test: {
    client: "better-sqlite3",
    connection: "./data/elegance_test.db",
    useNullAsDefault: true,
    migrations: { directory: "./migrations", extension: "js" },
    seeds: { directory: "./seeds", extension: "js" },
  },
  production: pgConfig(connectionString),
};

export default config;