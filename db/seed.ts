import { sql } from "drizzle-orm";
import { getDb } from "../api/queries/connection";

async function seed() {
  const db = getDb();
  await db.execute(sql`SELECT 1`);
  console.log("Database connection verified. No mandatory seed data is required.");
  process.exit(0);
}

seed().catch((error: unknown) => {
  console.error("Database seed check failed:", error);
  process.exit(1);
});
