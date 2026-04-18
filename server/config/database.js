import knex from "knex";
import dotenv from "dotenv";
import knexConfig from "../knexfile.js";

dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.DB_URL;

let finalConfig;
if (connectionString && connectionString.includes("supabase.co")) {
  finalConfig = {
    client: "pg",
    connection: {
      host: "db.lwiybyfwcaxuvkkulfvm.supabase.co",
      port: 5432,
      database: "postgres",
      user: "postgres",
      password: "Mrnobody@@7200",
      ssl: { rejectUnauthorized: false }
    },
    useNullAsDefault: true,
    pool: { min: 2, max: 10 }
  };
} else {
  const environment = process.env.NODE_ENV || "development";
  finalConfig = knexConfig[environment];
}

const db = knex(finalConfig);

export default db;