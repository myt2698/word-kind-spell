import "dotenv/config";
import mysql from "mysql2/promise";
import { analyzeWordForStudy } from "../src/utils/phonics";

type WordRow = {
  id: number;
  word: string;
  phonetic: string | null;
  tags: string | null;
};

const highConfidencePatterns = [
  "eigh",
  "air",
  "are",
  "ear",
  "ere",
  "eir",
  "ire",
  "ore",
  "our",
  "oor",
  "qu",
  "nk",
  "str",
  "ture",
] as const;

const tagPatterns: Record<string, string[]> = {
  "-ful /fl/": ["ful"],
  "-ous /əs/": ["ous"],
  "Ms /mɪz/": ["ms"],
  air: ["air"],
  al: ["al"],
  all: ["all"],
  and: ["and"],
  "ar/ɑː/": ["ar"],
  "are /eə/": ["are"],
  "ask 词族 a /ɑː/": ["ask"],
  "ass/ɑː/": ["ass"],
  "au /ɔː/": ["au"],
  "aw/ɔː/": ["aw"],
  ay: ["ay"],
  "ch /tʃ/": ["ch"],
  "ck /k/": ["ck"],
  dr: ["dr"],
  "ea /ɪə/": ["ea"],
  "ea/e/": ["ea"],
  "ea/eɪ/": ["ea"],
  "ea/iː/": ["ea"],
  "ear /eə/": ["ear"],
  "ear /ɪə/": ["ear"],
  ee: ["ee"],
  "eigh /eɪ/": ["eigh"],
  "en /ən/（非重读词尾）": ["en"],
  "eo /iː/": ["eo"],
  er: ["er"],
  "ere/eir /eə/": ["ere", "eir"],
  "ere /ɪə/": ["ere"],
  ese: ["ese"],
  "ew/juː/": ["ew"],
  "gh不发音": ["gh"],
  "i+ld/nd": ["ild", "ind"],
  "ice 在多音节词中 /iːs/": ["ice"],
  ice在多音节词: ["ice"],
  igh: ["igh"],
  ile: ["ile"],
  "ing/ɪŋ/": ["ing"],
  "ir /ɜː/": ["ir"],
  ire: ["ire"],
  "ng /ŋ/": ["ng"],
  "nk /ŋk/": ["nk"],
  "oa /əʊ/": ["oa"],
  oi: ["oi"],
  old: ["old"],
  "ong/ɒŋ/": ["ong"],
  oo: ["oo"],
  oor: ["oor"],
  "oot/ood/ook": ["oot", "ood", "ook"],
  "or 在非重读音节/ər/": ["or"],
  "or/ɔː/": ["or"],
  ore: ["ore"],
  "ou/aʊ/": ["ou"],
  "ou/u:/": ["ou"],
  "our /ɔː/": ["our"],
  "our/ə/": ["our"],
  "ow/aʊ/": ["ow"],
  "ow/əʊ/": ["ow"],
  "oy /ɔɪ/": ["oy"],
  ph: ["ph"],
  pl: ["pl"],
  ple: ["ple"],
  qu: ["qu"],
  "sh /ʃ/": ["sh"],
  str: ["str"],
  "th /ð/": ["th"],
  "ture/tʃə/": ["ture"],
  "ui/u:/": ["ui"],
  ur: ["ur"],
  "uy /aɪ/": ["uy"],
  "war /wɔː/": ["war"],
  "wh /h/": ["wh"],
  "wh /w/": ["wh"],
  wor: ["wor"],
  "wor /wɜː/": ["wor"],
};

const expectedTagPrefixes: Partial<Record<(typeof highConfidencePatterns)[number], string[]>> = {
  air: ["air"],
  are: ["are "],
  ear: ["ear "],
  ere: ["ere/eir"],
  eir: ["ere/eir"],
  ire: ["ire"],
  ore: ["ore"],
  our: ["our"],
  oor: ["oor"],
  eigh: ["eigh"],
  qu: ["qu"],
  nk: ["nk "],
  str: ["str"],
  ture: ["ture"],
};

function groupCounts<T>(items: T[], key: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const groupKey = key(item);
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), item]);
  }
  return [...groups.entries()].map(([name, values]) => ({
    name,
    count: values.length,
    words: [...new Set(values.map((value: any) => value.word))],
  }));
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const db = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [rows] = await db.query(`
      SELECT
        w.id,
        LOWER(TRIM(w.word)) AS word,
        w.phonetic,
        GROUP_CONCAT(t.name SEPARATOR '|||') AS tags
      FROM words w
      LEFT JOIN word_tags wt ON wt.wordId = w.id
      LEFT JOIN tags t ON t.id = wt.tagId
      GROUP BY w.id
      ORDER BY w.word
    `);

    const words = (rows as WordRow[]).map((row) => {
      const analysis = analyzeWordForStudy(row.word);
      return {
        ...row,
        tagList: row.tags?.split("|||").filter(Boolean) ?? [],
        syllables: analysis.syllables,
        blocks: analysis.blocks.map((block) => block.letters.toLowerCase()),
      };
    });

    const reconstructionFailures = words
      .filter((word) => word.blocks.join("") !== word.word)
      .map((word) => ({
        word: word.word,
        blocks: word.blocks.join("|"),
        reconstructed: word.blocks.join(""),
      }));

    const highConfidenceIssues = words.flatMap((word) =>
      highConfidencePatterns
        .filter((pattern) => word.word.includes(pattern) && !word.blocks.includes(pattern))
        .map((pattern) => ({
          word: word.word,
          pattern,
          blocks: word.blocks.join("|"),
        })),
    );

    const tagBlockMismatches = words.flatMap((word) =>
      word.tagList.flatMap((tag) => {
        const patterns = tagPatterns[tag];
        if (!patterns) return [];
        const expected = patterns.find((pattern) => word.word.includes(pattern));
        if (!expected || word.blocks.includes(expected)) return [];
        return [{
          word: word.word,
          tag,
          expected,
          blocks: word.blocks.join("|"),
        }];
      }),
    );

    const missingExpectedTags = words.flatMap((word) =>
      highConfidencePatterns.flatMap((pattern) => {
        const prefixes = expectedTagPrefixes[pattern];
        if (!prefixes || !word.word.includes(pattern)) return [];
        const found = word.tagList.some((tag) =>
          prefixes.some((prefix) => tag.toLowerCase().startsWith(prefix)),
        );
        return found ? [] : [{ word: word.word, pattern, tags: word.tagList }];
      }),
    );

    const knownWrongTagAssignments = words.flatMap((word) => {
      if (word.word === "why" && word.tagList.includes("wh /h/")) {
        return [{
          word: word.word,
          currentTag: "wh /h/",
          expectedTag: "wh /w/",
          reason: "why begins with /w/, not /h/",
        }];
      }
      if (word.word === "clear" && word.tagList.includes("ea/iː/")) {
        return [{
          word: word.word,
          currentTag: "ea/iː/",
          expectedTag: "ear /ɪə/",
          reason: "clear uses the ear spelling for /ɪə/ in the configured British pronunciation",
        }];
      }
      return [];
    });

    const result = {
      generatedAt: new Date().toISOString(),
      dataset: {
        rows: words.length,
        distinctWords: new Set(words.map((word) => word.word)).size,
        taggedWords: words.filter((word) => word.tagList.length > 0).length,
      },
      summary: {
        reconstructionFailures: reconstructionFailures.length,
        highConfidenceIssueHits: highConfidenceIssues.length,
        highConfidenceAffectedWords: new Set(
          highConfidenceIssues.map((issue) => issue.word),
        ).size,
        tagBlockMismatchHits: tagBlockMismatches.length,
        tagBlockAffectedWords: new Set(
          tagBlockMismatches.map((issue) => issue.word),
        ).size,
        missingExpectedTags: missingExpectedTags.length,
        knownWrongTagAssignments: knownWrongTagAssignments.length,
      },
      reconstructionFailures,
      highConfidenceByPattern: groupCounts(
        highConfidenceIssues,
        (issue) => issue.pattern,
      ),
      highConfidenceIssues,
      tagBlockByTag: groupCounts(tagBlockMismatches, (issue) => issue.tag),
      tagBlockMismatches,
      missingExpectedTags,
      knownWrongTagAssignments,
    };

    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
