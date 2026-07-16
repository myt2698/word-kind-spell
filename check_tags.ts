
import { getDb } from "./api/queries/connection";
import { tags, wordTags } from "./db/schema";

async function main() {
  const db = getDb();
  const allTags = await db.select().from(tags);
  console.log("Tags count:", allTags.length);
  for (const t of allTags) {
    console.log("  Tag:", t.id, t.name, "userId:", t.userId);
  }
  const allWordTags = await db.select().from(wordTags);
  console.log("\nWordTags count:", allWordTags.length);
}
main().catch(console.error);
