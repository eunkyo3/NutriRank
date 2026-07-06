import { defineConfig } from "drizzle-kit";

// DATABASE_PATH mirrors db/client.ts's default so drizzle-kit and the app agree
// on where the SQLite file lives.
export default defineConfig({
  dialect: "sqlite",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? "./data/nutrirank.sqlite",
  },
});
