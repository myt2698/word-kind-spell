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

const mergeSpecs = [
  {
    canonicalName: "辅音+y 单音节 /aɪ/",
    description:
      "单音节词末尾的“辅音字母 + y”通常发 /aɪ/，如 my、why、dry、fly；bye、goodbye 末尾的 y 也归入这一长音类别。",
    sourceNames: [
      "辅音+y 单音节 /aɪ/",
      "辅+y 单音节",
      "y/aɪ/",
      "y /aɪ/（bye）",
    ],
    reroutes: {
      body: "辅+y多音节",
      candy: "辅+y多音节",
    },
  },
  {
    canonicalName: "oy /ɔɪ/",
    description:
      "oy 常出现在单词或音节末尾，整体发双元音 /ɔɪ/，如 boy、toy、enjoy。",
    sourceNames: ["oy /ɔɪ/", "oy/ɔɪ/", "oy"],
    reroutes: {},
  },
];

const connection = await mysql.createConnection(databaseUrl);
const query = async (sql, params = []) => (await connection.query(sql, params))[0];

try {
  const sourceNames = [...new Set(mergeSpecs.flatMap((spec) => spec.sourceNames))];
  const sourceTags = await query(
    `SELECT id, name, description
       FROM tags
      WHERE userId = ? AND name IN (?)
      ORDER BY id`,
    [catalogOwnerId, sourceNames],
  );
  const sourceTagIds = sourceTags.map((tag) => Number(tag.id));
  const sourceLinks =
    sourceTagIds.length > 0
      ? await query(
          `SELECT wt.id, wt.wordId, wt.tagId, w.word, t.name tagName
             FROM word_tags wt
             JOIN words w ON w.id = wt.wordId
             JOIN tags t ON t.id = wt.tagId
            WHERE wt.tagId IN (?)
            ORDER BY t.name, w.word, wt.id`,
          [sourceTagIds],
        )
      : [];

  const plan = mergeSpecs.map((spec) => ({
    canonicalName: spec.canonicalName,
    sourceTags: sourceTags
      .filter((tag) => spec.sourceNames.includes(tag.name))
      .map((tag) => ({ id: Number(tag.id), name: tag.name })),
    linksToCanonical: sourceLinks
      .filter(
        (link) =>
          spec.sourceNames.includes(link.tagName) &&
          !spec.reroutes[link.word.trim().toLocaleLowerCase("en-US")],
      )
      .map((link) => link.word),
    reroutes: sourceLinks
      .filter(
        (link) =>
          spec.sourceNames.includes(link.tagName) &&
          spec.reroutes[link.word.trim().toLocaleLowerCase("en-US")],
      )
      .map((link) => ({
        word: link.word,
        target:
          spec.reroutes[link.word.trim().toLocaleLowerCase("en-US")],
      })),
  }));

  if (!apply) {
    console.log(JSON.stringify({ mode: "dry-run", catalogOwnerId, plan }, null, 2));
    process.exitCode = 0;
  } else {
    const backup = {
      createdAt: new Date().toISOString(),
      catalogOwnerId,
      sourceTags,
      sourceLinks,
    };
    const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
    const backupDirectory = join(projectRoot, "backups");
    await mkdir(backupDirectory, { recursive: true });
    const timestamp = backup.createdAt.replaceAll(":", "-").replaceAll(".", "-");
    const backupPath = join(
      backupDirectory,
      `phonics-tag-merge-${timestamp}.json`,
    );
    const backupJson = JSON.stringify(backup, null, 2);
    await writeFile(backupPath, backupJson, "utf8");

    await connection.beginTransaction();
    try {
      const ensureTag = async (name, description = null) => {
        const [existing] = await query(
          "SELECT id FROM tags WHERE userId = ? AND name = ? ORDER BY id LIMIT 1",
          [catalogOwnerId, name],
        );
        if (existing) {
          if (description) {
            await query("UPDATE tags SET description = ? WHERE id = ?", [
              description,
              existing.id,
            ]);
          }
          return Number(existing.id);
        }
        const result = await query(
          "INSERT INTO tags (userId, name, description) VALUES (?, ?, ?)",
          [catalogOwnerId, name, description],
        );
        return Number(result.insertId);
      };

      for (const spec of mergeSpecs) {
        const canonicalTagId = await ensureTag(
          spec.canonicalName,
          spec.description,
        );
        const relevantTags = sourceTags.filter((tag) =>
          spec.sourceNames.includes(tag.name),
        );
        const relevantTagIds = relevantTags.map((tag) => Number(tag.id));
        const relevantLinks = sourceLinks.filter((link) =>
          spec.sourceNames.includes(link.tagName),
        );

        for (const link of relevantLinks) {
          const wordKey = link.word.trim().toLocaleLowerCase("en-US");
          const rerouteName = spec.reroutes[wordKey];
          const targetTagId = rerouteName
            ? await ensureTag(rerouteName)
            : canonicalTagId;
          await query(
            "INSERT IGNORE INTO word_tags (wordId, tagId) VALUES (?, ?)",
            [link.wordId, targetTagId],
          );
          if (rerouteName) {
            await query(
              "DELETE FROM word_tags WHERE wordId = ? AND tagId = ?",
              [link.wordId, canonicalTagId],
            );
          }
        }

        const legacyTagIds = relevantTagIds.filter(
          (tagId) => tagId !== canonicalTagId,
        );
        if (legacyTagIds.length > 0) {
          await query("DELETE FROM word_tags WHERE tagId IN (?)", [legacyTagIds]);
          await query(
            "DELETE FROM tags WHERE userId = ? AND id IN (?)",
            [catalogOwnerId, legacyTagIds],
          );
        }
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    }

    const canonicalNames = mergeSpecs.map((spec) => spec.canonicalName);
    const merged = await query(
      `SELECT t.id, t.name, COUNT(wt.wordId) wordCount,
              GROUP_CONCAT(w.word ORDER BY w.word SEPARATOR ', ') words
         FROM tags t
         LEFT JOIN word_tags wt ON wt.tagId = t.id
         LEFT JOIN words w ON w.id = wt.wordId
        WHERE t.userId = ? AND t.name IN (?)
        GROUP BY t.id, t.name
        ORDER BY t.name`,
      [catalogOwnerId, canonicalNames],
    );
    const remainingLegacy = await query(
      `SELECT id, name
         FROM tags
        WHERE userId = ? AND name IN (?) AND name NOT IN (?)`,
      [catalogOwnerId, sourceNames, canonicalNames],
    );
    console.log(
      JSON.stringify(
        {
          mode: "applied",
          backupPath,
          backupSha256: createHash("sha256")
            .update(backupJson)
            .digest("hex"),
          merged,
          remainingLegacy,
        },
        null,
        2,
      ),
    );
  }
} finally {
  await connection.end();
}
