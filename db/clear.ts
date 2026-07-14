import { getDb } from "../api/queries/connection";
import { sql } from "drizzle-orm";

async function clear() {
  const db = getDb();
  // Clear all tables in FK-safe order
  await db.execute(sql`DELETE FROM word_tags`);
  await db.execute(sql`DELETE FROM word_logs`);
  await db.execute(sql`DELETE FROM words`);
  await db.execute(sql`DELETE FROM tags`);
  await db.execute(sql`DELETE FROM word_groups`);
  await db.execute(sql`DELETE FROM users`);
  console.log("All tables cleared!");
}

clear().catch(console.error);
