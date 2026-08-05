import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

import {
  tagDescriptions,
  textbookDescription,
  textbookName,
  units,
} from "./data/pep-grade5-volume1-data.mjs";

const apply = process.argv.includes("--apply");
const databaseUrl = process.env.DATABASE_URL;
const catalogOwnerId = Number(process.env.CATALOG_OWNER_USER_ID);
const entries = units.flatMap((unit) =>
  unit.entries.map((entry) => ({ ...entry, unit: unit.name })),
);

function normalize(value) {
  return value.trim().toLocaleLowerCase("en-US");
}

function mergeExamples(incoming, existing) {
  const merged = [];
  for (const value of [incoming, existing]) {
    for (const sentence of (value ?? "").split("\n").map((item) => item.trim())) {
      if (sentence && !merged.includes(sentence)) merged.push(sentence);
    }
  }
  return merged.slice(0, 3).join("\n");
}

function notesFor(entry) {
  return [
    `音节拆分：${entry.split}。`,
    `自然拼读：${entry.tags.join("；")}。`,
    `教材页码：${entry.sourcePages.join("、")}。`,
  ].join("");
}

function validateData() {
  const errors = [];
  const expectedUnitCounts = [18, 17, 20, 20, 21, 23];
  const seenMemberships = new Set();

  if (units.length !== 6) errors.push(`单元数量应为 6，实际为 ${units.length}`);
  units.forEach((unit, unitIndex) => {
    if (unit.entries.length !== expectedUnitCounts[unitIndex]) {
      errors.push(
        `${unit.name} 词条数应为 ${expectedUnitCounts[unitIndex]}，实际为 ${unit.entries.length}`,
      );
    }
    for (const entry of unit.entries) {
      const key = `${unit.name}|${normalize(entry.word)}`;
      if (seenMemberships.has(key)) errors.push(`重复单元词条：${key}`);
      seenMemberships.add(key);

      const examples = entry.example.split("\n").filter(Boolean);
      if (examples.length < 2 || examples.length > 3) {
        errors.push(`${key} 的例句数量为 ${examples.length}，应为 2–3 条`);
      }
      if (!entry.phonetic.trim()) errors.push(`${key} 缺少音标`);
      if (!entry.definition.trim()) errors.push(`${key} 缺少释义`);
      if (!entry.split.trim()) errors.push(`${key} 缺少音节拆分`);
      if (!entry.tags.length) errors.push(`${key} 缺少自然拼读标签`);
      if (!entry.sourcePages.length) errors.push(`${key} 缺少教材页码`);
      for (const tag of entry.tags) {
        if (!tagDescriptions[tag]) errors.push(`${key} 使用了未定义标签：${tag}`);
      }
    }
  });

  const uniqueWords = new Set(entries.map((entry) => normalize(entry.word)));
  if (entries.length !== 119) {
    errors.push(`单元词条关联数应为 119，实际为 ${entries.length}`);
  }
  if (uniqueWords.size !== 118) {
    errors.push(`唯一单词数应为 118，实际为 ${uniqueWords.size}`);
  }
  if (errors.length) {
    throw new Error(`教材数据校验失败：\n${errors.join("\n")}`);
  }
}

validateData();

const uniqueWordNames = [...new Set(entries.map((entry) => normalize(entry.word)))];
const localSummary = {
  mode: apply ? "apply" : databaseUrl ? "dry-run" : "local-validation",
  textbookName,
  units: units.map((unit) => ({
    name: unit.name,
    description: unit.description,
    memberships: unit.entries.length,
  })),
  memberships: entries.length,
  uniqueWords: uniqueWordNames.length,
  examples: entries.reduce(
    (total, entry) => total + entry.example.split("\n").length,
    0,
  ),
  phonicsTags: Object.keys(tagDescriptions).length,
};
console.log(JSON.stringify(localSummary, null, 2));

if (!databaseUrl) {
  if (apply) throw new Error("DATABASE_URL is required for --apply");
  console.log("本地教材数据校验通过；设置数据库环境变量后可预览或写入数据库。");
  process.exit(0);
}
if (!Number.isInteger(catalogOwnerId) || catalogOwnerId <= 0) {
  throw new Error("CATALOG_OWNER_USER_ID must be a positive integer");
}

const connection = await mysql.createConnection(databaseUrl);
const query = async (sql, params = []) => (await connection.query(sql, params))[0];

const [existingTextbook] = await query(
  "SELECT * FROM textbooks WHERE userId = ? AND name = ? LIMIT 1",
  [catalogOwnerId, textbookName],
);
const existingGroups = existingTextbook
  ? await query(
      "SELECT * FROM word_groups WHERE userId = ? AND textbookId = ? ORDER BY sortOrder, id",
      [catalogOwnerId, existingTextbook.id],
    )
  : [];
const existingWords = await query(
  `SELECT id, groupId, word, phonetic, definition, example, notes
     FROM words
    WHERE userId = ? AND LOWER(TRIM(word)) IN (?)`,
  [catalogOwnerId, uniqueWordNames],
);
const existingTags = await query(
  "SELECT id, name, description FROM tags WHERE userId = ? AND name IN (?) ORDER BY id",
  [catalogOwnerId, Object.keys(tagDescriptions)],
);

console.log(
  JSON.stringify(
    {
      textbookExists: Boolean(existingTextbook),
      existingTextbookId: existingTextbook ? Number(existingTextbook.id) : null,
      existingGroups: existingGroups.map((group) => group.name),
      reusableCatalogWords: existingWords.length,
      wordsToCreate: uniqueWordNames.length - existingWords.length,
      reusableTags: existingTags.length,
      tagsToCreate: Object.keys(tagDescriptions).length - existingTags.length,
    },
    null,
    2,
  ),
);

if (!apply) {
  await connection.end();
  process.exit(0);
}

const existingWordIds = existingWords.map((word) => Number(word.id));
const backup = {
  createdAt: new Date().toISOString(),
  catalogOwnerId,
  textbook: existingTextbook ?? null,
  groups: existingGroups,
  words: existingWords,
  links:
    existingWordIds.length > 0
      ? await query(
          "SELECT * FROM word_group_links WHERE wordId IN (?) ORDER BY id",
          [existingWordIds],
        )
      : [],
  tags: existingTags,
  wordTags:
    existingWordIds.length > 0
      ? await query("SELECT * FROM word_tags WHERE wordId IN (?) ORDER BY id", [
          existingWordIds,
        ])
      : [],
};
const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const backupDirectory = join(projectRoot, "backups");
await mkdir(backupDirectory, { recursive: true });
const backupJson = JSON.stringify(backup, null, 2);
const backupPath = join(
  backupDirectory,
  `pep-grade5-volume1-sync-${backup.createdAt.replaceAll(":", "-").replaceAll(".", "-")}.json`,
);
await writeFile(backupPath, backupJson, "utf8");
console.log(
  JSON.stringify({
    backupPath,
    backupSha256: createHash("sha256").update(backupJson).digest("hex"),
  }),
);

let textbookId;
const groupIdByUnit = new Map();
const tagIdByName = new Map();
let insertedWords = 0;
let reusedWords = 0;
let insertedTags = 0;
let reusedTags = 0;

await connection.beginTransaction();
try {
  if (existingTextbook) {
    textbookId = Number(existingTextbook.id);
    await query(
      "UPDATE textbooks SET description = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
      [textbookDescription, textbookId],
    );
  } else {
    const result = await query(
      `INSERT INTO textbooks (userId, name, description, isDefault, sortOrder)
       VALUES (?, ?, ?, 0, 0)`,
      [catalogOwnerId, textbookName, textbookDescription],
    );
    textbookId = Number(result.insertId);
  }

  const currentGroups = await query(
    "SELECT * FROM word_groups WHERE userId = ? AND textbookId = ?",
    [catalogOwnerId, textbookId],
  );
  const currentGroupByName = new Map(
    currentGroups.map((group) => [normalize(group.name).replaceAll(" ", ""), group]),
  );
  for (const [index, unit] of units.entries()) {
    const existing = currentGroupByName.get(normalize(unit.name).replaceAll(" ", ""));
    if (existing) {
      groupIdByUnit.set(unit.name, Number(existing.id));
      await query(
        `UPDATE word_groups
            SET name = ?, description = ?, sortOrder = ?, updatedAt = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [unit.name, unit.description, index, existing.id],
      );
    } else {
      const result = await query(
        `INSERT INTO word_groups (userId, textbookId, name, description, sortOrder)
         VALUES (?, ?, ?, ?, ?)`,
        [catalogOwnerId, textbookId, unit.name, unit.description, index],
      );
      groupIdByUnit.set(unit.name, Number(result.insertId));
    }
  }

  for (const [name, description] of Object.entries(tagDescriptions)) {
    const [existing] = await query(
      "SELECT id, description FROM tags WHERE userId = ? AND name = ? ORDER BY id LIMIT 1",
      [catalogOwnerId, name],
    );
    if (existing) {
      reusedTags += 1;
      tagIdByName.set(name, Number(existing.id));
      if (!existing.description?.trim()) {
        await query("UPDATE tags SET description = ? WHERE id = ?", [
          description,
          existing.id,
        ]);
      }
    } else {
      insertedTags += 1;
      const result = await query(
        "INSERT INTO tags (userId, name, description) VALUES (?, ?, ?)",
        [catalogOwnerId, name, description],
      );
      tagIdByName.set(name, Number(result.insertId));
    }
  }

  const expectedMemberships = new Set(
    entries.map((entry) => `${entry.unit}|${normalize(entry.word)}`),
  );
  const oldLinks = await query(
    `SELECT link.id, g.name unit, w.word
       FROM word_group_links link
       JOIN word_groups g ON g.id = link.groupId
       JOIN words w ON w.id = link.wordId
      WHERE g.textbookId = ?`,
    [textbookId],
  );
  for (const link of oldLinks) {
    if (!expectedMemberships.has(`${link.unit}|${normalize(link.word)}`)) {
      await query("DELETE FROM word_group_links WHERE id = ?", [link.id]);
    }
  }

  for (const [index, entry] of entries.entries()) {
    const groupId = groupIdByUnit.get(entry.unit);
    const [existing] = await query(
      `SELECT w.*, g.textbookId primaryTextbookId
         FROM words w
    LEFT JOIN word_groups g ON g.id = w.groupId
        WHERE w.userId = ? AND LOWER(TRIM(w.word)) = ? LIMIT 1`,
      [catalogOwnerId, normalize(entry.word)],
    );
    let wordId;

    if (existing) {
      reusedWords += 1;
      wordId = Number(existing.id);
      const [outsideLink] = await query(
        `SELECT link.id
           FROM word_group_links link
           JOIN word_groups g ON g.id = link.groupId
          WHERE link.wordId = ? AND (g.textbookId IS NULL OR g.textbookId <> ?)
          LIMIT 1`,
        [wordId, textbookId],
      );
      const primaryGroupId =
        existing.groupId === null ||
        existing.primaryTextbookId === null ||
        Number(existing.primaryTextbookId) === textbookId
          ? groupId
          : Number(existing.groupId);
      const nextExample = outsideLink
        ? mergeExamples(entry.example, existing.example)
        : entry.example;
      await query(
        `UPDATE words
            SET groupId = ?, word = ?, phonetic = ?, definition = ?, example = ?,
                notes = ?, updatedAt = CURRENT_TIMESTAMP
          WHERE id = ? AND userId = ?`,
        [
          primaryGroupId,
          entry.word,
          entry.phonetic,
          entry.definition,
          nextExample,
          notesFor(entry),
          wordId,
          catalogOwnerId,
        ],
      );
    } else {
      insertedWords += 1;
      const result = await query(
        `INSERT INTO words
          (userId, groupId, word, phonetic, definition, example, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          catalogOwnerId,
          groupId,
          entry.word,
          entry.phonetic,
          entry.definition,
          entry.example,
          notesFor(entry),
        ],
      );
      wordId = Number(result.insertId);
    }

    await query(
      "INSERT IGNORE INTO word_group_links (wordId, groupId) VALUES (?, ?)",
      [wordId, groupId],
    );
    for (const tagName of entry.tags) {
      const tagId = tagIdByName.get(tagName);
      await query(
        `INSERT INTO word_tags (wordId, tagId)
         SELECT ?, ? WHERE NOT EXISTS (
           SELECT 1 FROM word_tags WHERE wordId = ? AND tagId = ?
         )`,
        [wordId, tagId, wordId, tagId],
      );
    }

    if ((index + 1) % 20 === 0 || index === entries.length - 1) {
      console.log(
        JSON.stringify({ phase: "words", completed: index + 1, total: entries.length }),
      );
    }
  }

  await connection.commit();
  console.log(
    JSON.stringify({
      phase: "database",
      status: "committed",
      textbookId,
      insertedWords,
      reusedWords,
      insertedTags,
      reusedTags,
    }),
  );
} catch (error) {
  await connection.rollback();
  throw error;
}

const audit = await query(
  `SELECT g.name unit,
          COUNT(DISTINCT link.wordId) wordCount,
          SUM(CASE WHEN w.phonetic IS NULL OR TRIM(w.phonetic) = '' THEN 1 ELSE 0 END) missingPhonetics,
          SUM(CASE WHEN w.example IS NULL OR TRIM(w.example) = '' OR w.example NOT LIKE CONCAT('%', CHAR(10), '%') THEN 1 ELSE 0 END) invalidExamples,
          SUM(CASE WHEN w.notes IS NULL OR TRIM(w.notes) = '' THEN 1 ELSE 0 END) missingNotes,
          SUM(CASE WHEN tag_counts.tagCount IS NULL OR tag_counts.tagCount = 0 THEN 1 ELSE 0 END) missingTags
     FROM word_groups g
LEFT JOIN word_group_links link ON link.groupId = g.id
LEFT JOIN words w ON w.id = link.wordId
LEFT JOIN (
           SELECT wordId, COUNT(*) tagCount
             FROM word_tags
            GROUP BY wordId
          ) tag_counts ON tag_counts.wordId = w.id
    WHERE g.textbookId = ?
    GROUP BY g.id, g.name, g.sortOrder
    ORDER BY g.sortOrder`,
  [textbookId],
);
console.log(JSON.stringify({ phase: "audit", textbookId, units: audit }, null, 2));
await connection.end();
