import knex from "knex";
import dotenv from "dotenv";

dotenv.config();

const getConnectionConfig = () => {
  const connectionString = process.env.DATABASE_URL || process.env.DB_URL;
  
  if (!connectionString) {
    return { client: "better-sqlite3", connection: "./data/elegance.db" };
  }

  if (connectionString.includes(".db") && !connectionString.includes("supabase")) {
    return { client: "better-sqlite3", connection: connectionString };
  }

  if (connectionString.includes("supabase.co")) {
    const url = new URL(connectionString.replace("postgres:", "postgres://"));
    const user = url.username;
    const password = url.password;
    const host = url.hostname;
    const port = url.port || 5432;
    const database = url.pathname.replace("/", "");
    
    return {
      client: "pg",
      connection: {
        host,
        port,
        database,
        user,
        password,
        ssl: { rejectUnauthorized: false }
      }
    };
  }

  return { client: "pg", connection: connectionString };
};

const db = knex({
  ...getConnectionConfig(),
  useNullAsDefault: true,
  pool: { min: 2, max: 10 }
});

export default db;
export { getConnectionConfig };