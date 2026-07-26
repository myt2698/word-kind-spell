import "dotenv/config";
import mysql from "mysql2/promise";

const apply = process.argv.includes("--apply");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error("DATABASE_URL is required");

const connection = await mysql.createConnection(databaseUrl);
const query = async (sql, params = []) => (await connection.query(sql, params))[0];

const [existingTable] = await query(
  `SELECT COUNT(*) count
     FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'word_group_links'`,
);

const [primaryCount] = await query(
  "SELECT COUNT(*) count FROM words WHERE groupId IS NOT NULL",
);

console.log(
  JSON.stringify(
    {
      mode: apply ? "apply" : "dry-run",
      tableExists: Number(existingTable.count) > 0,
      primaryGroupsToBackfill: Number(primaryCount.count),
    },
    null,
    2,
  ),
);

if (!apply) {
  await connection.end();
  process.exit(0);
}

await query(`
  CREATE TABLE IF NOT EXISTS word_group_links (
    id bigint unsigned NOT NULL AUTO_INCREMENT,
    wordId bigint unsigned NOT NULL,
    groupId bigint unsigned NOT NULL,
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY id (id),
    UNIQUE KEY word_group_links_word_group_unique (wordId, groupId),
    KEY word_group_links_wordId_words_id_fk (wordId),
    KEY word_group_links_groupId_word_groups_id_fk (groupId),
    CONSTRAINT word_group_links_wordId_words_id_fk
      FOREIGN KEY (wordId) REFERENCES words (id) ON DELETE CASCADE,
    CONSTRAINT word_group_links_groupId_word_groups_id_fk
      FOREIGN KEY (groupId) REFERENCES word_groups (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
`);

await query(`
  INSERT IGNORE INTO word_group_links (wordId, groupId)
  SELECT id, groupId
    FROM words
   WHERE groupId IS NOT NULL
`);

const [linkCount] = await query("SELECT COUNT(*) count FROM word_group_links");
const [orphanCount] = await query(`
  SELECT COUNT(*) count
    FROM words w
   WHERE w.groupId IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
         FROM word_group_links link
        WHERE link.wordId = w.id AND link.groupId = w.groupId
     )
`);

console.log(
  JSON.stringify(
    {
      linkCount: Number(linkCount.count),
      primaryGroupsMissingLink: Number(orphanCount.count),
    },
    null,
    2,
  ),
);

await connection.end();
