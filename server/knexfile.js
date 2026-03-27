import dotenv from "dotenv";
dotenv.config();

export default {
  development: {
    client: "pg",
    connection: {
      host: "localhost",
      port: 5432,
      database: "mydb",
      user: "myuser",
      password: "Nobody009",
    },
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
    connection: process.env.DB_URL,
    ssl: { rejectUnauthorized: false },
    migrations: {
      directory: "./migrations",
      extension: "js",
    },
  },
};
