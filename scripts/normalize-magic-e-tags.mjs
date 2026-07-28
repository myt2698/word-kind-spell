import "dotenv/config";
import mysql from "mysql2/promise";

const apply = process.argv.includes("--apply");
const databaseUrl = process.env.DATABASE_URL;
const catalogOwnerId = Number(process.env.CATALOG_OWNER_USER_ID);

if (!databaseUrl) throw new Error("DATABASE_URL is required");
if (!Number.isInteger(catalogOwnerId) || catalogOwnerId <= 0) {
  throw new Error("CATALOG_OWNER_USER_ID must be a positive integer");
}

const TARGET_TAGS = {
  aLong: {
    name: "VCe a_e /eɪ/",
    description:
      "a_e 是 VCe（元音—辅音—不发音 e）结构：末尾 e 不发音，使 a 发 /eɪ/，如 game、place。",
  },
  aException: {
    name: "VCe a_e 例外 /æ/",
    description:
      "have 等词虽然外形是 VCe（元音—辅音—e），但 a 不发字母本音 /eɪ/，而发短元音 /æ/。",
  },
  iLong: {
    name: "i_e /aɪ/",
    description:
      "i_e 是 VCe（元音—辅音—不发音 e）结构：末尾 e 不发音，使 i 发 /aɪ/，如 mine、kite。",
  },
  iException: {
    name: "VCe i_e 例外 /ɪ/",
    description:
      "give 等词虽然外形是 VCe（元音—辅音—e），但 i 不发字母本音 /aɪ/，而发短元音 /ɪ/。",
  },
  oLong: {
    name: "VCe o_e /əʊ/",
    description:
      "o_e 是 VCe（元音—辅音—不发音 e）结构：末尾 e 不发音，使 o 发 /əʊ/，如 close、phone。",
  },
  oException: {
    name: "VCe o_e 例外 /ʌ/",
    description:
      "come、love、some、one 等词虽然外形是 VCe（元音—辅音—e），但 o 不发字母本音 /əʊ/，需要作为例外归类记忆。",
  },
  uLong: {
    name: "VCe u_e /uː/",
    description:
      "u_e 是 VCe（元音—辅音—不发音 e）结构，末尾 e 通常不发音，u 发 /uː/ 或 /juː/，如 rule、cute。",
  },
  ure: {
    name: "ure /ʊə/",
    description:
      "ure 在 sure 等词中，英式英语可发 /ʊə/，部分口音中也可读作 /ɔː/，需要结合完整单词记忆。",
  },
};

const LEGACY_TAG_TARGETS = new Map([
  ["ace", "aLong"],
  ["afe", "aLong"],
  ["ake", "aLong"],
  ["ate", "aLong"],
  ["ave", "aException"],
  ["ice", "iLong"],
  ["ide", "iLong"],
  ["ike", "iLong"],
  ["ine", "iLong"],
  ["ite", "iLong"],
  ["ome", "oException"],
  ["one", "oLong"],
  ["ose", "oLong"],
  ["ove", "oException"],
  ["ule", "uLong"],
]);

const connection = await mysql.createConnection(databaseUrl);
const query = async (sql, params = []) =>
  (await connection.query(sql, params))[0];

const legacyNames = [...LEGACY_TAG_TARGETS.keys(), "ive", "ure"];
const legacyRows = await query(
  `SELECT t.id, t.name, COUNT(DISTINCT wt.wordId) wordCount,
          GROUP_CONCAT(DISTINCT w.word ORDER BY w.word SEPARATOR ', ') words
     FROM tags t
LEFT JOIN word_tags wt ON wt.tagId = t.id
LEFT JOIN words w ON w.id = wt.wordId
    WHERE t.userId = ? AND t.name IN (?)
    GROUP BY t.id, t.name
    ORDER BY t.name`,
  [catalogOwnerId, legacyNames],
);

console.log(
  JSON.stringify(
    {
      mode: apply ? "apply" : "dry-run",
      legacyTags: legacyRows,
      targetTags: Object.values(TARGET_TAGS).map(({ name }) => name),
    },
    null,
    2,
  ),
);

if (!apply) {
  await connection.end();
  process.exit(0);
}

const targetIdByKey = new Map();

await connection.beginTransaction();
try {
  for (const [key, tag] of Object.entries(TARGET_TAGS)) {
    const [existing] = await query(
      "SELECT id FROM tags WHERE userId = ? AND name = ? LIMIT 1 FOR UPDATE",
      [catalogOwnerId, tag.name],
    );
    let tagId;
    if (existing) {
      tagId = Number(existing.id);
      await query("UPDATE tags SET description = ? WHERE id = ?", [
        tag.description,
        tagId,
      ]);
    } else {
      const result = await query(
        "INSERT INTO tags (userId, name, description) VALUES (?, ?, ?)",
        [catalogOwnerId, tag.name, tag.description],
      );
      tagId = Number(result.insertId);
    }
    targetIdByKey.set(key, tagId);
  }

  const moveLink = async (wordId, targetKey) => {
    const targetId = targetIdByKey.get(targetKey);
    await query(
      `INSERT INTO word_tags (wordId, tagId)
       SELECT ?, ? WHERE NOT EXISTS (
         SELECT 1 FROM word_tags WHERE wordId = ? AND tagId = ?
       )`,
      [wordId, targetId, wordId, targetId],
    );
  };

  for (const [legacyName, targetKey] of LEGACY_TAG_TARGETS) {
    const [legacyTag] = await query(
      "SELECT id FROM tags WHERE userId = ? AND name = ? LIMIT 1 FOR UPDATE",
      [catalogOwnerId, legacyName],
    );
    if (!legacyTag) continue;
    const links = await query(
      "SELECT DISTINCT wordId FROM word_tags WHERE tagId = ?",
      [legacyTag.id],
    );
    for (const { wordId } of links) await moveLink(Number(wordId), targetKey);
    await query("DELETE FROM word_tags WHERE tagId = ?", [legacyTag.id]);
    await query("DELETE FROM tags WHERE id = ? AND userId = ?", [
      legacyTag.id,
      catalogOwnerId,
    ]);
  }

  const [iveTag] = await query(
    "SELECT id FROM tags WHERE userId = ? AND name = 'ive' LIMIT 1 FOR UPDATE",
    [catalogOwnerId],
  );
  if (iveTag) {
    const links = await query(
      `SELECT wt.wordId, LOWER(TRIM(w.word)) wordKey
         FROM word_tags wt
         JOIN words w ON w.id = wt.wordId
        WHERE wt.tagId = ?`,
      [iveTag.id],
    );
    for (const link of links) {
      await moveLink(
        Number(link.wordId),
        link.wordKey === "give" ? "iException" : "iLong",
      );
    }
    await query("DELETE FROM word_tags WHERE tagId = ?", [iveTag.id]);
    await query("DELETE FROM tags WHERE id = ? AND userId = ?", [
      iveTag.id,
      catalogOwnerId,
    ]);
  }

  const [ureTag] = await query(
    "SELECT id FROM tags WHERE userId = ? AND name = 'ure' LIMIT 1 FOR UPDATE",
    [catalogOwnerId],
  );
  if (ureTag) {
    const links = await query(
      "SELECT DISTINCT wordId FROM word_tags WHERE tagId = ?",
      [ureTag.id],
    );
    for (const { wordId } of links) await moveLink(Number(wordId), "ure");
    await query("DELETE FROM word_tags WHERE tagId = ?", [ureTag.id]);
    await query("DELETE FROM tags WHERE id = ? AND userId = ?", [
      ureTag.id,
      catalogOwnerId,
    ]);
  }

  const exceptionGroups = [
    {
      targetKey: "aException",
      words: ["have", "have a picnic", "have a walk"],
    },
    { targetKey: "iException", words: ["give"] },
    {
      targetKey: "oException",
      words: ["come", "done", "glove", "love", "one", "some"],
    },
  ];
  for (const group of exceptionGroups) {
    const words = await query(
      "SELECT id FROM words WHERE userId = ? AND LOWER(TRIM(word)) IN (?)",
      [catalogOwnerId, group.words],
    );
    for (const { id } of words) await moveLink(Number(id), group.targetKey);
  }

  await connection.commit();
} catch (error) {
  await connection.rollback();
  await connection.end();
  throw error;
}

const remainingLegacyTags = await query(
  "SELECT id, name FROM tags WHERE userId = ? AND name IN (?) ORDER BY name",
  [catalogOwnerId, legacyNames],
);
const targetAudit = await query(
  `SELECT t.name, COUNT(DISTINCT wt.wordId) wordCount,
          GROUP_CONCAT(DISTINCT w.word ORDER BY w.word SEPARATOR ', ') words
     FROM tags t
LEFT JOIN word_tags wt ON wt.tagId = t.id
LEFT JOIN words w ON w.id = wt.wordId
    WHERE t.userId = ? AND t.name IN (?)
    GROUP BY t.id, t.name
    ORDER BY t.name`,
  [catalogOwnerId, Object.values(TARGET_TAGS).map(({ name }) => name)],
);

console.log(
  JSON.stringify(
    {
      remainingLegacyTags,
      targetAudit,
    },
    null,
    2,
  ),
);

if (remainingLegacyTags.length > 0) {
  await connection.end();
  throw new Error("Legacy magic-e tags remain after normalization");
}

await connection.end();
