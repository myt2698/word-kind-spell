import { describe, expect, it } from "vitest";
import {
  analyzeWordForStudy,
  formatSyllableDivision,
  generateFillBlank,
  splitSyllables,
} from "../src/utils/phonics";

const CATALOG_WORD_DIVISIONS = [
  ["about", "a-bout"],
  ["adventure", "ad-ven-ture"],
  ["after", "af-ter"],
  ["afternoon", "af-ter-noon"],
  ["also", "al-so"],
  ["always", "al-ways"],
  ["among", "a-mong"],
  ["animal", "an-i-mal"],
  ["annoy", "an-noy"],
  ["apple", "ap-ple"],
  ["afternoon", "af-ter-noon"],
  ["autumn", "au-tumn"],
  ["baby", "ba-by"],
  ["banana", "ba-na-na"],
  ["basketball", "bas-ket-ball"],
  ["before", "be-fore"],
  ["beautiful", "beau-ti-ful"],
  ["body", "bod-y"],
  ["breakfast", "break-fast"],
  ["brother", "bro-ther"],
  ["busy", "bus-y"],
  ["Canada", "can-a-da"],
  ["candy", "can-dy"],
  ["China", "chi-na"],
  ["Chinese", "chi-nese"],
  ["children", "chil-dren"],
  ["classmate", "class-mate"],
  ["cleaner", "clean-er"],
  ["cloudy", "cloud-y"],
  ["colour", "col-our"],
  ["colourful", "col-our-ful"],
  ["community", "com-mu-ni-ty"],
  ["computer", "com-pu-ter"],
  ["cookie", "cook-ie"],
  ["cousin", "cous-in"],
  ["culture", "cul-ture"],
  ["delivery", "de-liv-er-y"],
  ["dinner", "din-ner"],
  ["doctor", "doc-tor"],
  ["dolphin", "dol-phin"],
  ["driver", "driv-er"],
  ["eighteen", "eigh-teen"],
  ["elephant", "e-le-phant"],
  ["eleven", "e-lev-en"],
  ["English", "eng-lish"],
  ["enjoy", "en-joy"],
  ["eraser", "e-ras-er"],
  ["every", "ev-ery"],
  ["everyone", "ev-ery-one"],
  ["factory", "fac-to-ry"],
  ["family", "fam-i-ly"],
  ["farmer", "farm-er"],
  ["father", "fa-ther"],
  ["favour", "fa-vour"],
  ["favourite", "fa-vour-ite"],
  ["fifteen", "fif-teen"],
  ["firefighter", "fire-fight-er"],
  ["flavour", "fla-vour"],
  ["football", "foot-ball"],
  ["fourteen", "four-teen"],
  ["future", "fu-ture"],
  ["garden", "gar-den"],
  ["giraffe", "gi-raffe"],
  ["goodbye", "good-bye"],
  ["grandfather", "grand-fa-ther"],
  ["grandma", "grand-ma"],
  ["grandmother", "grand-mo-ther"],
  ["grandpa", "grand-pa"],
  ["healthy", "health-y"],
  ["helpful", "help-ful"],
  ["hospital", "hos-pi-tal"],
  ["humour", "hu-mour"],
  ["hungry", "hun-gry"],
  ["idea", "i-de-a"],
  ["Japanese", "jap-a-nese"],
  ["letter", "let-ter"],
  ["library", "li-brar-y"],
  ["lion", "li-on"],
  ["listen", "lis-ten"],
  ["lovely", "love-ly"],
  ["many", "man-y"],
  ["monkey", "mon-key"],
  ["morning", "morn-ing"],
  ["mother", "mo-ther"],
  ["neighbour", "neigh-bour"],
  ["nineteen", "nine-teen"],
  ["office", "of-fice"],
  ["orange", "or-ange"],
  ["over", "o-ver"],
  ["panda", "pan-da"],
  ["paper", "pa-per"],
  ["painting", "paint-ing"],
  ["PE", "p-e"],
  ["pencil", "pen-cil"],
  ["people", "peo-ple"],
  ["photo", "pho-to"],
  ["picture", "pic-ture"],
  ["police", "po-lice"],
  ["purple", "pur-ple"],
  ["question", "ques-tion"],
  ["quiet", "qui-et"],
  ["rabbit", "rab-bit"],
  ["rainy", "rain-y"],
  ["ruler", "ru-ler"],
  ["season", "sea-son"],
  ["seven", "sev-en"],
  ["seventeen", "sev-en-teen"],
  ["sister", "sis-ter"],
  ["sixteen", "six-teen"],
  ["snowman", "snow-man"],
  ["snowy", "snow-y"],
  ["story", "sto-ry"],
  ["student", "stu-dent"],
  ["sugar", "sug-ar"],
  ["summer", "sum-mer"],
  ["sunny", "sun-ny"],
  ["sweater", "sweat-er"],
  ["Sydney", "syd-ney"],
  ["teacher", "teach-er"],
  ["thirteen", "thir-teen"],
  ["tiger", "ti-ger"],
  ["today", "to-day"],
  ["together", "to-ge-ther"],
  ["toilet", "toi-let"],
  ["tomorrow", "to-mor-row"],
  ["twenty", "twen-ty"],
  ["UK", "u-k"],
  ["uncle", "un-cle"],
  ["under", "un-der"],
  ["USA", "u-s-a"],
  ["vegetable", "veg-e-ta-ble"],
  ["very", "ver-y"],
  ["water", "wa-ter"],
  ["weather", "wea-ther"],
  ["window", "win-dow"],
  ["windy", "wind-y"],
  ["winter", "win-ter"],
  ["woman", "wom-an"],
  ["yellow", "yel-low"],
  ["yes", "yes"],
  ["yummy", "yum-my"],
] as const;

const CATALOG_PHRASE_DIVISIONS = [
  ["a lot of", "a lot of"],
  ["bus stop", "bus stop"],
  ["delivery worker", "de-liv-er-y work-er"],
  ["factory worker", "fac-to-ry work-er"],
  ["get together", "get to-ge-ther"],
  ["in class", "in class"],
  ["look after", "look af-ter"],
  ["make the bed", "make the bed"],
  ["office worker", "of-fice work-er"],
  ["piggy bank", "pig-gy bank"],
  ["police officer", "po-lice of-fi-cer"],
  ["red panda", "red pan-da"],
  ["T-shirt", "t-shirt"],
] as const;

const CATALOG_IRREGULAR_SINGLE_SYLLABLES = [
  "buy",
  "closed",
  "eight",
  "eye",
  "queen",
  "their",
  "tired",
  "tongue",
  "weight",
  "whose",
  "year",
  "your",
] as const;

describe("catalog syllable divisions", () => {
  it.each(CATALOG_WORD_DIVISIONS)("%s → %s", (word, expected) => {
    expect(splitSyllables(word).join("-")).toBe(expected);
  });

  it.each(CATALOG_PHRASE_DIVISIONS)("%s → %s", (word, expected) => {
    expect(formatSyllableDivision(word)).toBe(expected);
  });

  it.each(CATALOG_IRREGULAR_SINGLE_SYLLABLES)("%s stays whole", (word) => {
    expect(splitSyllables(word)).toEqual([word.toLowerCase()]);
  });

  it("expands Mr to its spoken syllables", () => {
    expect(splitSyllables("Mr")).toEqual(["mis", "ter"]);
  });

  it("expands Mrs to its spoken syllables", () => {
    expect(splitSyllables("Mrs")).toEqual(["mis", "iz"]);
  });
});

describe("phonics analysis", () => {
  it.each([
    ["share", ["sh", "are"], "are"],
    ["queen", ["qu", "ee", "n"], "qu"],
    ["beautiful", ["b", "eau", "t", "i", "f", "u", "l"], "eau"],
    ["eight", ["eigh", "t"], "eigh"],
    ["light", ["l", "igh", "t"], "igh"],
    ["picture", ["p", "i", "c", "ture"], "ture"],
    ["monkey", ["m", "o", "nk", "e", "y"], "nk"],
  ])(
    "keeps the reviewed longest grapheme in %s",
    (word, expectedBlocks, expectedPattern) => {
      const analysis = analyzeWordForStudy(word);

      expect(analysis.blocks.map((block) => block.letters)).toEqual(
        expectedBlocks,
      );
      expect(analysis.patterns).toContainEqual(
        expect.objectContaining({ text: expectedPattern }),
      );
    },
  );

  it("does not reduce are in share to ar plus magic e", () => {
    const analysis = analyzeWordForStudy("share");

    expect(analysis.patterns).not.toContainEqual(
      expect.objectContaining({ text: "ar" }),
    );
    expect(analysis.patterns).not.toContainEqual(
      expect.objectContaining({ type: "magic_e" }),
    );
  });

  it("does not treat the silent t in listen as an st blend", () => {
    const analysis = analyzeWordForStudy("listen");

    expect(analysis.patterns).not.toContainEqual(
      expect.objectContaining({ text: "st" }),
    );
    expect(analysis.blocks.map((block) => block.letters).join("")).toBe(
      "listen",
    );
  });

  it("does not join ie across the syllable boundary in quiet", () => {
    const analysis = analyzeWordForStudy("quiet");

    expect(analysis.syllables).toEqual(["qui", "et"]);
    expect(analysis.blocks.map((block) => block.letters)).toEqual([
      "qu",
      "i",
      "e",
      "t",
    ]);
    expect(analysis.patterns).not.toContainEqual(
      expect.objectContaining({ text: "ie" }),
    );
  });

  it("does not join ere across syllables in different", () => {
    const analysis = analyzeWordForStudy("different");

    expect(analysis.syllables).toEqual(["dif", "fer", "ent"]);
    expect(analysis.blocks.map((block) => block.letters).join("")).toBe(
      "different",
    );
    expect(analysis.patterns).not.toContainEqual(
      expect.objectContaining({ text: "ere" }),
    );
  });

  it("keeps spelling blocks faithful for spoken abbreviations", () => {
    const analysis = analyzeWordForStudy("Mr");

    expect(analysis.syllables).toEqual(["mis", "ter"]);
    expect(analysis.blocks.map((block) => block.letters)).toEqual(["m", "r"]);
    expect(analysis.blocks.map((block) => block.letters).join("")).toBe("mr");
  });

  it("does not label the internal ele in elephant as magic e", () => {
    const analysis = analyzeWordForStudy("elephant");

    expect(analysis.syllables).toEqual(["e", "le", "phant"]);
    expect(analysis.patterns).not.toContainEqual(
      expect.objectContaining({ type: "magic_e" }),
    );
    expect(analysis.patterns).toContainEqual(
      expect.objectContaining({
        type: "consonant_blend",
        text: "ph",
        explanation: expect.stringContaining("/f/"),
      }),
    );
  });

  it("keeps th together in the second syllable of together", () => {
    expect(analyzeWordForStudy("together").syllables).toEqual([
      "to",
      "ge",
      "ther",
    ]);
  });
});

describe("fill-in-the-blank practice", () => {
  it("keeps spaces structural in phrases", () => {
    const pattern = generateFillBlank("swimming pool");

    expect(pattern.display[8]).toBe(" ");
    expect(pattern.answerPositions).not.toContain(8);
    expect(
      pattern.answerPositions.every(
        (position) => /[a-z]/.test("swimming pool"[position]),
      ),
    ).toBe(true);
  });

  it("keeps punctuation structural", () => {
    const phrase = "say \"Hi!\"";
    const pattern = generateFillBlank(phrase);

    expect(
      pattern.answerPositions.every(
        (position) => /[a-z]/i.test(phrase[position]),
      ),
    ).toBe(true);
  });
});
