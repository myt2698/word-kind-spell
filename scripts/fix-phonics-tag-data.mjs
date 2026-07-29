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

const requiredTags = {
  "ear /ɪə/":
    "ear 在 hear、near、clear 等词中，英式英语常发双元音 /ɪə/；美式英语通常读作 /ɪr/。",
  "ear /ɜː/":
    "ear 在 learn、earth、early 等词中，英式英语通常发 /ɜː/；美式英语通常读作 /ɝː/。",
  "-our /ə/（colour）":
    "colour、colourful、favourite 中的非重读 our 在英式英语里通常弱读为 /ə/；美式英语通常带卷舌音。",
  "nk /ŋk/":
    "nk 通常对应两个连续辅音 /ŋk/：先用鼻腔发 /ŋ/，再发 /k/，如 bank、pink、drink。",
  "eigh /eɪ/":
    "eigh 在 eight、eighteen、weight、neighbour 中通常作为一个元音组合发 /eɪ/；其中 gh 不单独发音。",
  str:
    "str 是三个辅音组成的连缀，依次自然衔接 /s/、/t/、/r/，如 street、strong、straw。",
  "ere/eir /eə/":
    "ere、eir 在 where、there、their 中，英式英语通常发 /eə/，美式英语通常带卷舌音。",
  "wh /w/":
    "wh 在 which、why、where 等词首通常发 /w/；who、whose 是发 /h/ 的常见特例。",
  "th /θ/":
    "th 在 both、mouth、birthday、thanks、thing、three、throw 等词中通常发清辅音 /θ/，发音时舌尖轻触上下齿。",
};

const additions = {
  clear: ["ear /ɪə/"],
  colourful: ["-our /ə/（colour）"],
  drink: ["nk /ŋk/"],
  eight: ["eigh /eɪ/"],
  learn: ["ear /ɜː/"],
  monkey: ["nk /ŋk/"],
  mouth: ["th /θ/"],
  neighbour: ["eigh /eɪ/"],
  pink: ["nk /ŋk/"],
  straw: ["str"],
  weight: ["eigh /eɪ/"],
  where: ["ere/eir /eə/"],
  why: ["wh /w/"],
};

const removals = {
  clear: ["ea/iː/"],
  colourful: [
    "or 在非重读音节/ər/",
    "or/ɔː/",
    "our /aʊə/",
    "our/ə/",
  ],
  different: ["ere/eir /eə/", "ere /ɪə/"],
  mouth: ["th", "th /ð/"],
  why: ["wh /h/"],
};

const connection = await mysql.createConnection(databaseUrl);
const query = async (sql, values = []) => {
  const [rows] = await connection.query(sql, values);
  return rows;
};

try {
  const targetWords = [
    ...new Set([...Object.keys(additions), ...Object.keys(removals)]),
  ];
  const words = await query(
    `SELECT id, userId, word
       FROM words
      WHERE userId = ? AND LOWER(TRIM(word)) IN (?)
      ORDER BY word`,
    [catalogOwnerId, targetWords],
  );
  const wordByName = new Map(
    words.map((word) => [word.word.trim().toLocaleLowerCase("en-US"), word]),
  );
  const missingWords = targetWords.filter((word) => !wordByName.has(word));
  if (missingWords.length > 0) {
    throw new Error(`Catalog words not found: ${missingWords.join(", ")}`);
  }

  const wordIds = words.map((word) => Number(word.id));
  const beforeLinks = await query(
    `SELECT wt.id, wt.wordId, wt.tagId, t.name tagName
       FROM word_tags wt
       JOIN tags t ON t.id = wt.tagId
      WHERE wt.wordId IN (?)
      ORDER BY wt.wordId, wt.id`,
    [wordIds],
  );
  const existingTags = await query(
    `SELECT id, userId, name, description
       FROM tags
      WHERE userId = ? AND name IN (?)
      ORDER BY name, id`,
    [
      catalogOwnerId,
      [
        ...Object.keys(requiredTags),
        ...Object.values(removals).flat(),
      ],
    ],
  );

  const planned = {
    add: Object.entries(additions).flatMap(([word, tagNames]) =>
      tagNames.map((tagName) => ({ word, tagName })),
    ),
    remove: Object.entries(removals).flatMap(([word, tagNames]) =>
      tagNames.map((tagName) => ({ word, tagName })),
    ),
  };

  if (!apply) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          catalogOwnerId,
          targetWordCount: words.length,
          planned,
        },
        null,
        2,
      ),
    );
    process.exitCode = 0;
  } else {
    const backup = {
      createdAt: new Date().toISOString(),
      catalogOwnerId,
      words,
      tags: existingTags,
      wordTags: beforeLinks,
    };
    const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
    const backupDirectory = join(projectRoot, "backups");
    await mkdir(backupDirectory, { recursive: true });
    const timestamp = backup.createdAt.replaceAll(":", "-").replaceAll(".", "-");
    const backupPath = join(
      backupDirectory,
      `phonics-tag-fix-${timestamp}.json`,
    );
    const backupJson = JSON.stringify(backup, null, 2);
    await writeFile(backupPath, backupJson, "utf8");

    await connection.beginTransaction();
    try {
      const tagIdByName = new Map();
      for (const [name, description] of Object.entries(requiredTags)) {
        const [existingTag] = await query(
          "SELECT id FROM tags WHERE userId = ? AND name = ? ORDER BY id LIMIT 1",
          [catalogOwnerId, name],
        );
        let tagId;
        if (existingTag) {
          tagId = Number(existingTag.id);
          await query("UPDATE tags SET description = ? WHERE id = ?", [
            description,
            tagId,
          ]);
        } else {
          const result = await query(
            "INSERT INTO tags (userId, name, description) VALUES (?, ?, ?)",
            [catalogOwnerId, name, description],
          );
          tagId = Number(result.insertId);
        }
        tagIdByName.set(name, tagId);
      }

      for (const [wordName, tagNames] of Object.entries(removals)) {
        const wordId = Number(wordByName.get(wordName).id);
        for (const tagName of tagNames) {
          await query(
            `DELETE wt
               FROM word_tags wt
               JOIN tags t ON t.id = wt.tagId
              WHERE wt.wordId = ? AND t.userId = ? AND t.name = ?`,
            [wordId, catalogOwnerId, tagName],
          );
        }
      }

      for (const [wordName, tagNames] of Object.entries(additions)) {
        const wordId = Number(wordByName.get(wordName).id);
        for (const tagName of tagNames) {
          const tagId = tagIdByName.get(tagName);
          await query(
            `INSERT INTO word_tags (wordId, tagId)
             SELECT ?, ?
              WHERE NOT EXISTS (
                SELECT 1 FROM word_tags WHERE wordId = ? AND tagId = ?
              )`,
            [wordId, tagId, wordId, tagId],
          );
        }
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    }

    const afterLinks = await query(
      `SELECT w.word, t.name tagName
         FROM word_tags wt
         JOIN words w ON w.id = wt.wordId
         JOIN tags t ON t.id = wt.tagId
        WHERE wt.wordId IN (?)
        ORDER BY w.word, t.name`,
      [wordIds],
    );
    console.log(
      JSON.stringify(
        {
          mode: "applied",
          backupPath,
          backupSha256: createHash("sha256")
            .update(backupJson)
            .digest("hex"),
          targetWordCount: words.length,
          planned,
          wordTags: afterLinks,
        },
        null,
        2,
      ),
    );
  }
} finally {
  await connection.end();
}
