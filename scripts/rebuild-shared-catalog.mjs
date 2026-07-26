#!/usr/bin/env node

import "dotenv/config";
import fs from "node:fs";
import mysql from "mysql2/promise";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const forceProgressReset = args.includes("--force-progress-reset");
const backupFile =
  args.find((arg) => !arg.startsWith("--")) ?? "./wordmind-backup.json";
const catalogOwnerId = Number(process.env.CATALOG_OWNER_USER_ID);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}
if (!Number.isInteger(catalogOwnerId) || catalogOwnerId <= 0) {
  throw new Error("CATALOG_OWNER_USER_ID must be a positive integer");
}
if (!fs.existsSync(backupFile)) {
  throw new Error(`Backup file not found: ${backupFile}`);
}

function unwrapBackupValue(value) {
  if (typeof value !== "string") return value;
  const parsed = JSON.parse(value);
  return parsed?.result?.data?.json ?? parsed;
}

const rawBackup = JSON.parse(fs.readFileSync(backupFile, "utf8"));
const backupWords = unwrapBackupValue(rawBackup.words);
const backupGroups = unwrapBackupValue(rawBackup.groups);
const backupTags = unwrapBackupValue(rawBackup.tags);

if (
  !Array.isArray(backupWords) ||
  !Array.isArray(backupGroups) ||
  !Array.isArray(backupTags)
) {
  throw new Error("Backup must contain words, groups, and tags arrays");
}

const textbookNames = new Map();
for (const word of backupWords) {
  if (word.textbookId != null && word.textbookName) {
    textbookNames.set(Number(word.textbookId), String(word.textbookName));
  }
}

const formalTextbookIds = [
  ...new Set(
    backupGroups
      .map((group) => group.textbookId)
      .filter((id) => id != null)
      .map(Number),
  ),
];

for (const textbookId of formalTextbookIds) {
  if (!textbookNames.has(textbookId)) {
    throw new Error(`Missing textbook name for textbookId=${textbookId}`);
  }
}

const expectedTagLinks = backupWords.reduce(
  (count, word) => count + (Array.isArray(word.tags) ? word.tags.length : 0),
  0,
);

console.log("Shared catalog rebuild plan");
console.log(`  owner user id: ${catalogOwnerId}`);
console.log(`  formal textbooks: ${formalTextbookIds.length}`);
console.log(`  units: ${backupGroups.length}`);
console.log(`  words: ${backupWords.length}`);
console.log(`  tags: ${backupTags.length}`);
console.log(`  word-tag links: ${expectedTagLinks}`);

if (!apply) {
  console.log("Dry run only. Re-run with --apply to write changes.");
  process.exit(0);
}

const connection = await mysql.createConnection({
  uri: process.env.DATABASE_URL,
  connectTimeout: 30_000,
});
console.log("Connected to database");

try {
  const [owners] = await connection.execute(
    "SELECT id, name, role FROM users WHERE id = ? LIMIT 1",
    [catalogOwnerId],
  );
  const owner = owners[0];
  if (!owner || owner.role !== "admin") {
    throw new Error("Catalog owner must exist and have the admin role");
  }
  console.log(`Validated catalog owner: ${owner.name}`);

  const [progressRows] = await connection.execute(
    `SELECT
      (SELECT COUNT(*) FROM word_spellings s JOIN words w ON w.id = s.wordId WHERE w.userId = ?) spellings,
      (SELECT COUNT(*) FROM spelling_errors e JOIN words w ON w.id = e.wordId WHERE w.userId = ?) errors,
      (SELECT COUNT(*) FROM today_word_selections t JOIN words w ON w.id = t.wordId WHERE w.userId = ?) selections,
      (SELECT COUNT(*) FROM word_logs l JOIN words w ON w.id = l.wordId WHERE w.userId = ?) logs`,
    [catalogOwnerId, catalogOwnerId, catalogOwnerId, catalogOwnerId],
  );
  const progress = progressRows[0];
  const progressCount =
    Number(progress.spellings) +
    Number(progress.errors) +
    Number(progress.selections) +
    Number(progress.logs);

  if (progressCount > 0 && !forceProgressReset) {
    throw new Error(
      "Existing per-user progress references the current catalog. " +
        "Re-run with --force-progress-reset only after confirming that reset is acceptable.",
    );
  }
  console.log(`Existing progress references: ${progressCount}`);

  await connection.beginTransaction();
  console.log("Transaction started");

  const [oldGroups] = await connection.execute(
    "SELECT id FROM word_groups WHERE userId = ?",
    [catalogOwnerId],
  );
  const oldGroupIds = oldGroups.map((row) => Number(row.id));
  if (oldGroupIds.length > 0) {
    await connection.query(
      `UPDATE users SET defaultGroupId = NULL WHERE defaultGroupId IN (${oldGroupIds
        .map(() => "?")
        .join(",")})`,
      oldGroupIds,
    );
  }

  // Deleting words cascades their tag links, audio, logs, and per-user
  // spelling/error/selection records through the schema's foreign keys.
  await connection.execute("DELETE FROM words WHERE userId = ?", [
    catalogOwnerId,
  ]);
  await connection.execute("DELETE FROM tags WHERE userId = ?", [
    catalogOwnerId,
  ]);
  await connection.execute("DELETE FROM word_groups WHERE userId = ?", [
    catalogOwnerId,
  ]);
  await connection.execute("DELETE FROM textbooks WHERE userId = ?", [
    catalogOwnerId,
  ]);
  console.log("Removed the previous broken catalog");

  const textbookIdMap = new Map();
  for (const [index, oldTextbookId] of formalTextbookIds.entries()) {
    const [result] = await connection.execute(
      `INSERT INTO textbooks
        (userId, name, description, isDefault, sortOrder)
       VALUES (?, ?, NULL, 0, ?)`,
      [catalogOwnerId, textbookNames.get(oldTextbookId), index],
    );
    textbookIdMap.set(oldTextbookId, Number(result.insertId));
  }

  await connection.execute(
    `INSERT INTO textbooks
      (userId, name, description, isDefault, sortOrder)
     VALUES (?, '扩展词汇', '未归类到课本的单词', 1, -1)`,
    [catalogOwnerId],
  );
  console.log("Created textbooks");

  const groupIdMap = new Map();
  for (const group of backupGroups) {
    const newTextbookId = textbookIdMap.get(Number(group.textbookId));
    if (!newTextbookId) {
      throw new Error(`Unknown textbook for group ${group.id}`);
    }
    const [result] = await connection.execute(
      `INSERT INTO word_groups
        (userId, textbookId, name, description, sortOrder)
       VALUES (?, ?, ?, ?, ?)`,
      [
        catalogOwnerId,
        newTextbookId,
        group.name,
        group.description || null,
        Number(group.sortOrder ?? 0),
      ],
    );
    groupIdMap.set(Number(group.id), Number(result.insertId));
  }
  console.log("Created units");

  const tagIdMap = new Map();
  for (const tag of backupTags) {
    const [result] = await connection.execute(
      `INSERT INTO tags (userId, name, description)
       VALUES (?, ?, ?)`,
      [catalogOwnerId, tag.name, tag.description || null],
    );
    tagIdMap.set(Number(tag.id), Number(result.insertId));
  }
  console.log("Created tags");

  const wordIdMap = new Map();
  for (const word of backupWords) {
    const newGroupId =
      word.groupId == null ? null : groupIdMap.get(Number(word.groupId)) ?? null;
    const [result] = await connection.execute(
      `INSERT INTO words
        (userId, groupId, word, phonetic, definition, example, notes, proficiency, learningStatus)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'idle')`,
      [
        catalogOwnerId,
        newGroupId,
        word.word,
        word.phonetic || null,
        word.definition || "",
        word.example || null,
        word.notes || null,
        word.proficiency || "new",
      ],
    );
    wordIdMap.set(Number(word.id), Number(result.insertId));
  }
  console.log("Created words");

  let insertedTagLinks = 0;
  for (const word of backupWords) {
    if (!Array.isArray(word.tags)) continue;
    const newWordId = wordIdMap.get(Number(word.id));
    for (const tag of word.tags) {
      const newTagId = tagIdMap.get(Number(tag.id));
      if (!newWordId || !newTagId) {
        throw new Error(`Broken word-tag link for word ${word.id}`);
      }
      await connection.execute(
        "INSERT INTO word_tags (wordId, tagId) VALUES (?, ?)",
        [newWordId, newTagId],
      );
      insertedTagLinks++;
    }
  }

  if (insertedTagLinks !== expectedTagLinks) {
    throw new Error(
      `Expected ${expectedTagLinks} word-tag links, inserted ${insertedTagLinks}`,
    );
  }

  await connection.commit();
  console.log("Transaction committed");

  const [validationRows] = await connection.execute(
    `SELECT
      (SELECT COUNT(*) FROM textbooks WHERE userId = ? AND isDefault = 0) formalTextbooks,
      (SELECT COUNT(*) FROM textbooks WHERE userId = ? AND isDefault = 1) defaultTextbooks,
      (SELECT COUNT(*) FROM word_groups WHERE userId = ?) units,
      (SELECT COUNT(*) FROM words WHERE userId = ?) words,
      (SELECT COUNT(*) FROM tags WHERE userId = ?) tags,
      (SELECT COUNT(*) FROM word_tags wt JOIN words w ON w.id = wt.wordId WHERE w.userId = ?) tagLinks`,
    [
      catalogOwnerId,
      catalogOwnerId,
      catalogOwnerId,
      catalogOwnerId,
      catalogOwnerId,
      catalogOwnerId,
    ],
  );

  console.log("Rebuild completed");
  console.log(JSON.stringify(validationRows[0], null, 2));
} catch (error) {
  try {
    await connection.rollback();
  } catch {
    // Ignore rollback errors when no transaction was started.
  }
  throw error;
} finally {
  await connection.end();
}
