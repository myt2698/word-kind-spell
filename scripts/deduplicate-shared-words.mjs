import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const apply = process.argv.includes("--apply");
const databaseUrl = process.env.DATABASE_URL;
const catalogOwnerId = Number(process.env.CATALOG_OWNER_USER_ID);

if (!databaseUrl) throw new Error("DATABASE_URL is required");
if (!Number.isInteger(catalogOwnerId) || catalogOwnerId <= 0) {
  throw new Error("CATALOG_OWNER_USER_ID must be a positive integer");
}

const connection = await mysql.createConnection(databaseUrl);
const query = async (sql, params = []) => (await connection.query(sql, params))[0];
const normalize = (value) => value.trim().toLocaleLowerCase("en-US");
const filledLength = (value) => value?.trim().length ?? 0;

function informationScore(row) {
  return (
    (row.groupId === null ? 0 : 1_000_000) +
    filledLength(row.definition) * 5 +
    filledLength(row.example) * 2 +
    filledLength(row.notes) * 2 +
    filledLength(row.phonetic)
  );
}

function bestValue(rows, field) {
  return rows
    .map((row) => row[field]?.trim())
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)[0] ?? null;
}

function mergeLines(rows, field) {
  const values = [];
  const seen = new Set();
  for (const row of rows) {
    for (const rawLine of row[field]?.split(/\r?\n/) ?? []) {
      const line = rawLine.trim();
      const key = line.toLocaleLowerCase("zh-CN");
      if (line && !seen.has(key)) {
        seen.add(key);
        values.push(line);
      }
    }
  }
  return values.length > 0 ? values.join("\n") : null;
}

function chooseCanonical(rows) {
  return [...rows].sort(
    (left, right) => informationScore(right) - informationScore(left) || left.id - right.id,
  )[0];
}

function proficiencyRank(value) {
  return { new: 0, learning: 1, familiar: 2, mastered: 3 }[value] ?? 0;
}

function learningStatusRank(value) {
  return { idle: 0, paused: 1, active: 2 }[value] ?? 0;
}

const words = await query(
  `SELECT id, userId, groupId, word, phonetic, definition, example, notes,
          proficiency, learningStatus, createdAt, updatedAt
     FROM words
    WHERE userId = ?
    ORDER BY id`,
  [catalogOwnerId],
);

const groupsByWord = new Map();
for (const word of words) {
  const key = normalize(word.word);
  const existing = groupsByWord.get(key) ?? [];
  existing.push(word);
  groupsByWord.set(key, existing);
}

const duplicateGroups = [...groupsByWord.entries()]
  .filter(([, rows]) => rows.length > 1)
  .map(([normalizedWord, rows]) => {
    const canonical = chooseCanonical(rows);
    return {
      normalizedWord,
      canonical,
      duplicates: rows.filter((row) => row.id !== canonical.id),
      rows,
    };
  });

const duplicateIds = duplicateGroups.flatMap((group) => group.duplicates.map((row) => row.id));
const affectedIds = duplicateGroups.flatMap((group) => group.rows.map((row) => row.id));
const mappings = Object.fromEntries(
  duplicateGroups.flatMap((group) =>
    group.duplicates.map((row) => [String(row.id), group.canonical.id]),
  ),
);

console.log(
  JSON.stringify(
    {
      mode: apply ? "apply" : "dry-run",
      catalogOwnerId,
      before: {
        rows: words.length,
        uniqueNormalizedWords: groupsByWord.size,
        duplicateGroups: duplicateGroups.length,
        duplicateRows: duplicateIds.length,
      },
      plan: duplicateGroups.map((group) => ({
        word: group.normalizedWord,
        keepId: group.canonical.id,
        removeIds: group.duplicates.map((row) => row.id),
        keepGroupId: group.canonical.groupId,
      })),
    },
    null,
    2,
  ),
);

if (!apply || duplicateGroups.length === 0) {
  await connection.end();
  process.exit(0);
}

const relatedTables = [
  "word_tags",
  "word_logs",
  "word_spellings",
  "spelling_errors",
  "today_word_selections",
  "word_audios",
];
const backup = {
  createdAt: new Date().toISOString(),
  catalogOwnerId,
  mappings,
  words: await query("SELECT * FROM words WHERE id IN (?) ORDER BY id", [affectedIds]),
  spellingSessions: await query(
    "SELECT * FROM spelling_sessions WHERE wordIds IS NOT NULL ORDER BY id",
  ),
  related: {},
};
for (const table of relatedTables) {
  backup.related[table] = await query(
    `SELECT * FROM \`${table}\` WHERE wordId IN (?) ORDER BY id`,
    [affectedIds],
  );
}

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const backupDirectory = join(projectRoot, "backups");
await mkdir(backupDirectory, { recursive: true });
const timestamp = backup.createdAt.replaceAll(":", "-").replaceAll(".", "-");
const backupPath = join(backupDirectory, `word-dedup-${timestamp}.json`);
const backupJson = JSON.stringify(backup, null, 2);
await writeFile(backupPath, backupJson, "utf8");
const backupSha256 = createHash("sha256").update(backupJson).digest("hex");
console.log(JSON.stringify({ backupPath, backupSha256 }, null, 2));

await connection.beginTransaction();
try {
  for (const group of duplicateGroups) {
    const { canonical, duplicates, rows } = group;
    const allTagRows = backup.related.word_tags.filter((row) =>
      rows.some((word) => word.id === row.wordId),
    );
    const canonicalTagIds = new Set(
      allTagRows.filter((row) => row.wordId === canonical.id).map((row) => row.tagId),
    );
    const allTagIds = new Set(allTagRows.map((row) => row.tagId));
    const bestProficiency = [...rows]
      .sort((left, right) => proficiencyRank(right.proficiency) - proficiencyRank(left.proficiency))[0]
      .proficiency;

    await query(
      `UPDATE words
          SET word = ?, phonetic = ?, definition = ?, example = ?, notes = ?,
              proficiency = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ? AND userId = ?`,
      [
        canonical.word.trim(),
        bestValue(rows, "phonetic"),
        bestValue(rows, "definition") ?? canonical.definition,
        mergeLines(rows, "example"),
        mergeLines(rows, "notes"),
        bestProficiency,
        canonical.id,
        catalogOwnerId,
      ],
    );

    for (const tagId of allTagIds) {
      if (!canonicalTagIds.has(tagId)) {
        await query("INSERT INTO word_tags (wordId, tagId) VALUES (?, ?)", [
          canonical.id,
          tagId,
        ]);
      }
    }

    for (const duplicate of duplicates) {
      await query("UPDATE word_logs SET wordId = ? WHERE wordId = ?", [
        canonical.id,
        duplicate.id,
      ]);
      await query("UPDATE spelling_errors SET wordId = ? WHERE wordId = ?", [
        canonical.id,
        duplicate.id,
      ]);
      await query("UPDATE today_word_selections SET wordId = ? WHERE wordId = ?", [
        canonical.id,
        duplicate.id,
      ]);
      await query("UPDATE word_audios SET wordId = ? WHERE wordId = ?", [
        canonical.id,
        duplicate.id,
      ]);
      await query("UPDATE word_spellings SET wordId = ? WHERE wordId = ?", [
        canonical.id,
        duplicate.id,
      ]);
    }

    const spellingRows = await query(
      "SELECT * FROM word_spellings WHERE wordId = ? ORDER BY userId, id",
      [canonical.id],
    );
    const spellingByUser = new Map();
    for (const row of spellingRows) {
      const existing = spellingByUser.get(row.userId) ?? [];
      existing.push(row);
      spellingByUser.set(row.userId, existing);
    }
    for (const userRows of spellingByUser.values()) {
      if (userRows.length < 2) continue;
      const keep = [...userRows].sort(
        (left, right) =>
          learningStatusRank(right.learningStatus) - learningStatusRank(left.learningStatus) ||
          right.totalAttempts - left.totalAttempts ||
          left.id - right.id,
      )[0];
      const remove = userRows.filter((row) => row.id !== keep.id);
      await query(
        `UPDATE word_spellings
            SET level = ?, streak = ?, errorCount = ?, totalAttempts = ?,
                totalCorrect = ?, source = ?, learningStatus = ?,
                nextReviewAt = ?, lastReviewAt = ?, updatedAt = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [
          Math.max(...userRows.map((row) => row.level)),
          Math.max(...userRows.map((row) => row.streak)),
          userRows.reduce((sum, row) => sum + row.errorCount, 0),
          userRows.reduce((sum, row) => sum + row.totalAttempts, 0),
          userRows.reduce((sum, row) => sum + row.totalCorrect, 0),
          userRows.some((row) => row.source === "manual") ? "manual" : "auto",
          [...userRows].sort(
            (left, right) =>
              learningStatusRank(right.learningStatus) - learningStatusRank(left.learningStatus),
          )[0].learningStatus,
          new Date(Math.min(...userRows.map((row) => new Date(row.nextReviewAt).getTime()))),
          userRows
            .map((row) => row.lastReviewAt)
            .filter(Boolean)
            .sort((left, right) => new Date(right) - new Date(left))[0] ?? null,
          keep.id,
        ],
      );
      await query("DELETE FROM word_spellings WHERE id IN (?)", [
        remove.map((row) => row.id),
      ]);
    }

    await query(
      `DELETE newer
         FROM today_word_selections newer
         JOIN today_word_selections older
           ON older.userId = newer.userId
          AND older.wordId = newer.wordId
          AND older.date = newer.date
          AND older.id < newer.id
        WHERE newer.wordId = ?`,
      [canonical.id],
    );
    await query(
      `DELETE newer
         FROM word_audios newer
         JOIN word_audios older
           ON older.wordId = newer.wordId
          AND older.id < newer.id
        WHERE newer.wordId = ?`,
      [canonical.id],
    );

    await query("DELETE FROM words WHERE id IN (?) AND userId = ?", [
      duplicates.map((row) => row.id),
      catalogOwnerId,
    ]);
  }

  for (const session of backup.spellingSessions) {
    let wordIds;
    try {
      wordIds = JSON.parse(session.wordIds);
    } catch {
      continue;
    }
    if (!Array.isArray(wordIds)) continue;
    const remapped = [...new Set(wordIds.map((id) => mappings[String(id)] ?? id))];
    if (JSON.stringify(remapped) !== JSON.stringify(wordIds)) {
      await query("UPDATE spelling_sessions SET wordIds = ? WHERE id = ?", [
        JSON.stringify(remapped),
        session.id,
      ]);
    }
  }

  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
}

const existingIndex = await query(
  `SELECT 1
     FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'words'
      AND index_name = 'words_userId_word_unique'
    LIMIT 1`,
);
if (existingIndex.length === 0) {
  await query(
    "ALTER TABLE words ADD UNIQUE INDEX words_userId_word_unique (userId, word)",
  );
}

const after = (
  await query(
    `SELECT COUNT(*) rowCount,
            COUNT(DISTINCT LOWER(TRIM(word))) uniqueNormalizedWords
       FROM words
      WHERE userId = ?`,
    [catalogOwnerId],
  )
)[0];
const remainingDuplicates = await query(
  `SELECT LOWER(TRIM(word)) word, COUNT(*) copies
     FROM words
    WHERE userId = ?
    GROUP BY LOWER(TRIM(word))
   HAVING COUNT(*) > 1`,
  [catalogOwnerId],
);

console.log(
  JSON.stringify(
    {
      after,
      remainingDuplicateGroups: remainingDuplicates.length,
      backupPath,
      backupSha256,
    },
    null,
    2,
  ),
);

await connection.end();
