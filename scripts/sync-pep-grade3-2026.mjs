import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const apply = process.argv.includes("--apply");
const databaseUrl = process.env.DATABASE_URL;
const catalogOwnerId = Number(process.env.CATALOG_OWNER_USER_ID);
const textbookName = "人教pep三下";

if (!databaseUrl) throw new Error("DATABASE_URL is required");
if (!Number.isInteger(catalogOwnerId) || catalogOwnerId <= 0) {
  throw new Error("CATALOG_OWNER_USER_ID must be a positive integer");
}

const expectedWordsByUnit = {
  "Unit 1": [
    "where", "from", "about", "today", "teacher", "student", "after", "who",
    "girl", "neighbour", "boy", "woman", "man", "Mr", "classmate", "he",
    "English", "she", "very", "UK", "China", "Canada", "USA",
  ],
  "Unit 2": [
    "has", "long", "body", "short", "leg", "right", "fat", "thin", "slow",
    "love", "tail", "her", "gift", "picture", "card", "sing", "dance", "face",
    "all", "so", "talk", "song", "or", "much",
  ],
  "Unit 3": [
    "eraser", "find", "ruler", "pen", "pencil", "book", "bag", "paper",
    "these", "see", "smell", "taste", "hear", "touch", "learn", "nose",
    "tongue", "class", "in class", "computer",
  ],
  "Unit 4": [
    "breakfast", "time", "bread", "egg", "milk", "noodle", "juice", "rice",
    "meat", "vegetable", "healthy", "plate", "soup", "fruit", "colourful",
    "candy", "yummy",
  ],
  "Unit 5": [
    "at", "boat", "cool", "keep", "home", "ball", "doll", "car", "on",
    "shelf", "in", "box", "cap", "map", "under", "still", "put",
  ],
  "Unit 6": [
    "fifteen", "twelve", "fourteen", "thirteen", "eleven", "twenty",
    "seventeen", "sixteen", "eighteen", "nineteen", "piggy bank", "pay",
    "back",
  ],
};

const tagDescriptions = {
  "ong/ɒŋ/":
    "ong 在 long、song 等词中作为一个韵尾整体拼读：o 发英式短元音 /ɒ/，ng 发鼻音 /ŋ/，合起来是 /ɒŋ/。",
  "ear /ɪə/":
    "ear 在 hear、near 等词中，英式英语常发双元音 /ɪə/；美式英语通常读作 /ɪr/。",
  "ea/e/":
    "ea 是元音组合；在 bread、breakfast、head 等词中例外地发短元音 /e/，需要按这一组词集中记忆。",
  "i_e /aɪ/":
    "i_e 是 VCe（元音—辅音—不发音 e）结构：末尾 e 不单独发音，使前面的 i 发字母本音 /aɪ/，如 time、nine。",
  "en /ən/（非重读词尾）":
    "非重读词尾 en 常弱读为 /ən/，快速语流中也可能表现为成音节的 /n/，如 seven、eleven。",
  "辅+y多音节":
    "多音节词末尾的“辅音字母 + y”中，y 通常发短而清晰的 /i/，如 very、twenty、piggy。",
  "ee":
    "ee 是常见元音组合，通常发长元音 /iː/，如 see、teen、sixteen。",
  "eigh /eɪ/":
    "eigh 在 eight、eighteen 中作为一个元音组合发 /eɪ/；其中 gh 不单独发音。",
  "双写辅音，保护短元音":
    "两个相同辅音字母通常提示前一个重读音节保持短元音；拆音节时常从双辅音中间分开，如 pig-gy、rab-bit。",
  "nk /ŋk/":
    "nk 通常对应两个连续辅音 /ŋk/：先用鼻腔发 /ŋ/，再发 /k/，如 bank、pink。",
  "ay":
    "ay 常出现在单词或音节末尾，作为元音组合发 /eɪ/，如 day、play、pay。",
  "ck /k/":
    "在单音节词末尾，一个短元音之后常用 ck 拼写 /k/，如 back、neck、pick、rock。",
  "ir /ɜː/":
    "ir 是元音加 r 的组合；在英式英语重读音节中通常发 /ɜː/，如 girl、thirteen。",
  "our /ɔː/":
    "our 在 four、fourteen 中，英式英语发 /ɔː/；美式英语通常带卷舌读作 /ɔːr/。",
};

const textbookEntries = [
  {
    unit: "Unit 2",
    word: "long",
    phonetic: "/lɒŋ/",
    definition: "adj. （长度或距离）长的",
    example: "Your dog is cute. It has a long body and short legs.",
    notes: "自然拼读：long（1 个音节，闭音节）。按 l + ong 拼读；ong 在英式英语中发 /ɒŋ/。",
    tags: ["ong/ɒŋ/"],
  },
  {
    unit: "Unit 3",
    word: "hear",
    phonetic: "/hɪə(r)/",
    definition: "v. 听见；听到",
    example: "Hear the sound.",
    notes: "自然拼读：hear（1 个音节）。按 h + ear 拼读；ear 在英式英语中发 /ɪə/，美式英语常发 /ɪr/。",
    tags: ["ear /ɪə/"],
  },
  {
    unit: "Unit 4",
    word: "breakfast",
    phonetic: "/ˈbrekfəst/",
    definition: "n. 早餐；早饭",
    example: "Breakfast time!",
    notes: "音节拆分：break-fast（2 个音节，复合词边界）。在 breakfast 中，ea 读短元音 /e/；第二音节弱读为 /fəst/。",
    tags: ["ea/e/"],
  },
  {
    unit: "Unit 4",
    word: "time",
    phonetic: "/taɪm/",
    definition: "n. 时间",
    example: "Breakfast time!",
    notes: "自然拼读：time（1 个音节，VCe/魔法 e）。i_e 中末尾 e 不发音，i 发字母本音 /aɪ/。",
    tags: ["i_e /aɪ/"],
  },
  {
    unit: "Unit 6",
    word: "eleven",
    phonetic: "/ɪˈlevn/",
    definition: "num. 十一",
    example: "Five and six makes eleven.",
    notes: "音节拆分：e-lev-en（3 个音节，重音在第二音节）。词尾 en 为非重读音节，常弱读为 /ən/ 或成音节 /n/。",
    tags: ["en /ən/（非重读词尾）"],
  },
  {
    unit: "Unit 6",
    word: "twenty",
    phonetic: "/ˈtwenti/",
    definition: "num. 二十",
    example: "It's twenty yuan.",
    notes: "音节拆分：twen-ty（2 个音节，重音在第一音节）。词尾“辅音 + y”中的 y 发 /i/。",
    tags: ["辅+y多音节"],
  },
  {
    unit: "Unit 6",
    word: "seventeen",
    phonetic: "/ˌsevnˈtiːn/",
    definition: "num. 十七",
    example: "Six yuan, or three for seventeen yuan.",
    notes: "音节拆分：sev-en-teen（3 个音节，主重音在 teen）。词尾 teen 中 ee 发 /iː/；seven 的非重读 en 弱读。",
    tags: ["en /ən/（非重读词尾）", "ee"],
  },
  {
    unit: "Unit 6",
    word: "sixteen",
    phonetic: "/ˌsɪksˈtiːn/",
    definition: "num. 十六",
    example: "How about three for sixteen yuan?",
    notes: "音节拆分：six-teen（2 个音节，主重音在 teen）。teen 中的 ee 发长元音 /iː/。",
    tags: ["ee"],
  },
  {
    unit: "Unit 6",
    word: "eighteen",
    phonetic: "/ˌeɪˈtiːn/",
    definition: "num. 十八",
    example: "Sixteen, seventeen, eighteen. Don't watch the clock.",
    notes: "音节拆分：eigh-teen（2 个音节，主重音在 teen）。eigh 发 /eɪ/，其中 gh 不单独发音；ee 发 /iː/。",
    tags: ["eigh /eɪ/", "ee"],
  },
  {
    unit: "Unit 6",
    word: "nineteen",
    phonetic: "/ˌnaɪnˈtiːn/",
    definition: "num. 十九",
    example: "Nineteen minutes, tick.",
    notes: "音节拆分：nine-teen（2 个音节，主重音在 teen）。nine 中 i_e 发 /aɪ/；teen 中 ee 发 /iː/。",
    tags: ["i_e /aɪ/", "ee"],
  },
  {
    unit: "Unit 6",
    word: "piggy bank",
    phonetic: "/ˈpɪɡi bæŋk/",
    definition: "n. 猪形储钱罐",
    example: "I put them in my piggy bank.",
    notes: "音节拆分：pig-gy bank（复合词，piggy 为 2 个音节，bank 为 1 个音节）。双写 g 使 pig 保持短元音 /ɪ/；词尾 y 发 /i/；bank 中 nk 发 /ŋk/。",
    tags: ["双写辅音，保护短元音", "辅+y多音节", "nk /ŋk/"],
  },
  {
    unit: "Unit 6",
    word: "pay",
    phonetic: "/peɪ/",
    definition: "v. 付费",
    example: "I pay fifteen yuan for five books.",
    notes: "自然拼读：pay（1 个音节）。词尾元音组合 ay 发 /eɪ/。",
    tags: ["ay"],
  },
  {
    unit: "Unit 6",
    word: "back",
    phonetic: "/bæk/",
    definition: "adv. 回到原处",
    example: "I put two yuan back in my piggy bank.",
    notes: "自然拼读：back（1 个音节，闭音节）。短元音 a 发 /æ/；词尾 ck 合起来发一个 /k/。",
    tags: ["ck /k/"],
  },
];

const revisedExistingEntries = [
  {
    unit: "Unit 6",
    word: "twelve",
    phonetic: "/twelv/",
    definition: "num. 十二",
    example: "Add one, it's twelve.",
    notes: "自然拼读：twelve（1 个音节）。按 tw + e + lve 拼读；末尾 e 不发音，但这里的 e 仍发短元音 /e/，属于需要整体记忆的常用词。",
    tags: [],
  },
  {
    unit: "Unit 6",
    word: "thirteen",
    phonetic: "/ˌθɜːˈtiːn/",
    definition: "num. 十三",
    example: "Six and seven makes thirteen.",
    notes: "音节拆分：thir-teen（2 个音节，主重音在 teen）。ir 发 /ɜː/；ee 发 /iː/。",
    tags: ["ir /ɜː/", "ee"],
  },
  {
    unit: "Unit 6",
    word: "fourteen",
    phonetic: "/ˌfɔːˈtiːn/",
    definition: "num. 十四",
    example: "Add one, it's fourteen.",
    notes: "音节拆分：four-teen（2 个音节，主重音在 teen）。our 在英式英语中发 /ɔː/；ee 发 /iː/。",
    tags: ["our /ɔː/", "ee"],
  },
  {
    unit: "Unit 6",
    word: "fifteen",
    phonetic: "/ˌfɪfˈtiːn/",
    definition: "num. 十五",
    example: "Three fives are fifteen.",
    notes: "音节拆分：fif-teen（2 个音节，主重音在 teen）。teen 中的 ee 发长元音 /iː/。",
    tags: ["ee"],
  },
];

const phoneticCorrections = {
  China: "/ˈtʃaɪnə/",
  neighbour: "/ˈneɪbə(r)/",
  right: "/raɪt/",
  thin: "/θɪn/",
  bag: "/bæɡ/",
  book: "/bʊk/",
  bread: "/bred/",
  home: "/həʊm/",
  "in class": "/ɪn klɑːs/",
};

const connection = await mysql.createConnection(databaseUrl);
const query = async (sql, params = []) => (await connection.query(sql, params))[0];

const [textbook] = await query(
  "SELECT id FROM textbooks WHERE userId = ? AND name = ? LIMIT 1",
  [catalogOwnerId, textbookName],
);
if (!textbook) throw new Error(`Textbook not found: ${textbookName}`);

const groupRows = await query(
  "SELECT id, name FROM word_groups WHERE userId = ? AND textbookId = ?",
  [catalogOwnerId, textbook.id],
);
const groupIdByName = new Map(groupRows.map((group) => [group.name, Number(group.id)]));
for (const unit of Object.keys(expectedWordsByUnit)) {
  if (!groupIdByName.has(unit)) throw new Error(`Unit not found: ${unit}`);
}

const allExpectedWords = Object.values(expectedWordsByUnit).flat();
const currentRows = await query(
  `SELECT w.id, w.groupId, w.word, w.phonetic, w.definition, w.example, w.notes
     FROM words w
    WHERE w.userId = ? AND LOWER(w.word) IN (?)
    ORDER BY w.id`,
  [catalogOwnerId, allExpectedWords.map((word) => word.toLocaleLowerCase("en-US"))],
);
const currentByWord = new Map(
  currentRows.map((word) => [word.word.toLocaleLowerCase("en-US"), word]),
);

const plan = [...textbookEntries, ...revisedExistingEntries].map((entry) => {
  const existing = currentByWord.get(entry.word.toLocaleLowerCase("en-US"));
  return {
    action: existing ? "update" : "insert",
    word: entry.word,
    fromGroupId: existing?.groupId ?? null,
    toGroupId: groupIdByName.get(entry.unit),
    unit: entry.unit,
  };
});

console.log(
  JSON.stringify(
    {
      mode: apply ? "apply" : "dry-run",
      catalogOwnerId,
      textbookId: Number(textbook.id),
      expectedWordCount: allExpectedWords.length,
      currentTextbookWordCount: currentRows.filter((word) =>
        groupRows.some((group) => Number(group.id) === Number(word.groupId)),
      ).length,
      inserts: plan.filter((item) => item.action === "insert"),
      updates: plan.filter((item) => item.action === "update"),
      phoneticCorrections,
    },
    null,
    2,
  ),
);

if (!apply) {
  await connection.end();
  process.exit(0);
}

const affectedWordIds = currentRows.map((row) => row.id);
const tagNames = Object.keys(tagDescriptions);
const backup = {
  createdAt: new Date().toISOString(),
  catalogOwnerId,
  textbookId: Number(textbook.id),
  words: currentRows,
  wordTags:
    affectedWordIds.length > 0
      ? await query("SELECT * FROM word_tags WHERE wordId IN (?) ORDER BY id", [affectedWordIds])
      : [],
  tags: await query(
    "SELECT * FROM tags WHERE userId = ? AND name IN (?) ORDER BY id",
    [catalogOwnerId, tagNames],
  ),
  wordAudios:
    affectedWordIds.length > 0
      ? await query(
          "SELECT id, wordId, format, source, createdAt, updatedAt, LENGTH(audioData) audioDataLength FROM word_audios WHERE wordId IN (?) ORDER BY id",
          [affectedWordIds],
        )
      : [],
};

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const backupDirectory = join(projectRoot, "backups");
await mkdir(backupDirectory, { recursive: true });
const timestamp = backup.createdAt.replaceAll(":", "-").replaceAll(".", "-");
const backupPath = join(backupDirectory, `pep-grade3-2026-sync-${timestamp}.json`);
const backupJson = JSON.stringify(backup, null, 2);
await writeFile(backupPath, backupJson, "utf8");
console.log(
  JSON.stringify({
    backupPath,
    backupSha256: createHash("sha256").update(backupJson).digest("hex"),
  }),
);

await connection.beginTransaction();
try {
  const tagIdByName = new Map();
  for (const [name, description] of Object.entries(tagDescriptions)) {
    const [existingTag] = await query(
      "SELECT id FROM tags WHERE userId = ? AND name = ? ORDER BY id LIMIT 1",
      [catalogOwnerId, name],
    );
    let tagId;
    if (existingTag) {
      tagId = Number(existingTag.id);
      await query("UPDATE tags SET description = ? WHERE id = ?", [description, tagId]);
    } else {
      const result = await query(
        "INSERT INTO tags (userId, name, description) VALUES (?, ?, ?)",
        [catalogOwnerId, name, description],
      );
      tagId = Number(result.insertId);
    }
    tagIdByName.set(name, tagId);
  }

  for (const entry of [...textbookEntries, ...revisedExistingEntries]) {
    const groupId = groupIdByName.get(entry.unit);
    const [existing] = await query(
      "SELECT id FROM words WHERE userId = ? AND LOWER(word) = LOWER(?) LIMIT 1",
      [catalogOwnerId, entry.word],
    );
    let wordId;
    if (existing) {
      wordId = Number(existing.id);
      await query(
        `UPDATE words
            SET groupId = ?, word = ?, phonetic = ?, definition = ?, example = ?,
                notes = ?, updatedAt = CURRENT_TIMESTAMP
          WHERE id = ? AND userId = ?`,
        [
          groupId,
          entry.word,
          entry.phonetic,
          entry.definition,
          entry.example,
          entry.notes,
          wordId,
          catalogOwnerId,
        ],
      );
    } else {
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
          entry.notes,
        ],
      );
      wordId = Number(result.insertId);
    }

    for (const tagName of entry.tags) {
      const tagId = tagIdByName.get(tagName);
      const [existingLink] = await query(
        "SELECT id FROM word_tags WHERE wordId = ? AND tagId = ? LIMIT 1",
        [wordId, tagId],
      );
      if (!existingLink) {
        await query("INSERT INTO word_tags (wordId, tagId) VALUES (?, ?)", [wordId, tagId]);
      }
    }
  }

  for (const [word, phonetic] of Object.entries(phoneticCorrections)) {
    await query(
      `UPDATE words w
          JOIN word_groups g ON g.id = w.groupId
           SET w.phonetic = ?, w.updatedAt = CURRENT_TIMESTAMP
         WHERE w.userId = ? AND g.textbookId = ? AND LOWER(w.word) = LOWER(?)`,
      [phonetic, catalogOwnerId, textbook.id, word],
    );
  }

  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
}

const textbookWords = await query(
  `SELECT w.id, w.word
     FROM words w
     JOIN word_groups g ON g.id = w.groupId
    WHERE w.userId = ? AND g.textbookId = ?
    ORDER BY g.sortOrder, w.id`,
  [catalogOwnerId, textbook.id],
);

const wordsMissingAudio = await query(
  `SELECT w.id, w.word
     FROM words w
     JOIN word_groups g ON g.id = w.groupId
LEFT JOIN word_audios a ON a.wordId = w.id
    WHERE w.userId = ? AND g.textbookId = ? AND a.id IS NULL
    ORDER BY w.id`,
  [catalogOwnerId, textbook.id],
);

async function downloadAudio(word) {
  const failures = [];
  for (const type of [2, 1]) {
    const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}`;
    const response = await fetch(url);
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.startsWith("audio/")) {
      failures.push(`type=${type}: HTTP ${response.status}, ${contentType || "unknown type"}`);
      continue;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const isId3 = buffer.subarray(0, 3).toString("ascii") === "ID3";
    const isMpegFrame =
      buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
    if (buffer.length >= 500 && (isId3 || isMpegFrame)) {
      return buffer;
    }
    failures.push(`type=${type}: invalid MP3 (${buffer.length} bytes)`);
  }
  throw new Error(`${word}: ${failures.join("; ")}`);
}

const audioResults = [];
const queue = [...wordsMissingAudio];
const workers = Array.from({ length: Math.min(6, queue.length) }, async () => {
  while (queue.length > 0) {
    const word = queue.shift();
    try {
      const buffer = await downloadAudio(word.word);
      const [existing] = await query(
        "SELECT id FROM word_audios WHERE wordId = ? LIMIT 1",
        [word.id],
      );
      if (!existing) {
        await query(
          "INSERT INTO word_audios (wordId, audioData, format, source) VALUES (?, ?, 'mp3', 'youdao')",
          [word.id, buffer.toString("base64")],
        );
      }
      audioResults.push({ word: word.word, status: "inserted", bytes: buffer.length });
    } catch (error) {
      audioResults.push({ word: word.word, status: "failed", error: error.message });
    }
  }
});
await Promise.all(workers);

const auditRows = await query(
  `SELECT g.name unit, COUNT(DISTINCT w.id) wordCount,
          SUM(CASE WHEN w.phonetic IS NULL OR TRIM(w.phonetic) = '' THEN 1 ELSE 0 END) missingPhonetic,
          SUM(CASE WHEN w.example IS NULL OR TRIM(w.example) = '' THEN 1 ELSE 0 END) missingExample,
          SUM(CASE WHEN a.id IS NULL THEN 1 ELSE 0 END) missingAudio
     FROM word_groups g
LEFT JOIN words w ON w.groupId = g.id AND w.userId = ?
LEFT JOIN word_audios a ON a.wordId = w.id
    WHERE g.userId = ? AND g.textbookId = ?
    GROUP BY g.id, g.name, g.sortOrder
    ORDER BY g.sortOrder`,
  [catalogOwnerId, catalogOwnerId, textbook.id],
);

const actualRows = await query(
  `SELECT g.name unit, w.word
     FROM words w
     JOIN word_groups g ON g.id = w.groupId
    WHERE w.userId = ? AND g.textbookId = ?`,
  [catalogOwnerId, textbook.id],
);
const actualByUnit = new Map();
for (const row of actualRows) {
  const values = actualByUnit.get(row.unit) ?? [];
  values.push(row.word.toLocaleLowerCase("en-US"));
  actualByUnit.set(row.unit, values);
}
const vocabularyAudit = Object.entries(expectedWordsByUnit).map(([unit, expected]) => {
  const actual = actualByUnit.get(unit) ?? [];
  const expectedLower = expected.map((word) => word.toLocaleLowerCase("en-US"));
  return {
    unit,
    expected: expected.length,
    actual: actual.length,
    missing: expected.filter(
      (word) => !actual.includes(word.toLocaleLowerCase("en-US")),
    ),
    unexpected: actual.filter((word) => !expectedLower.includes(word)),
  };
});

console.log(
  JSON.stringify(
    {
      syncedWordCount: textbookWords.length,
      audio: {
        requested: wordsMissingAudio.length,
        inserted: audioResults.filter((item) => item.status === "inserted").length,
        failed: audioResults.filter((item) => item.status === "failed"),
      },
      auditRows,
      vocabularyAudit,
    },
    null,
    2,
  ),
);

await connection.end();
