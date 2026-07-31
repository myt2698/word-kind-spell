import { splitSyllables } from "../src/utils/phonics";

export type ReadingWord = {
  word: string;
  definition?: string | null;
};

export type ReadingQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
};

export type ReadingStory = {
  title: string;
  theme: string;
  content: string;
  questions: ReadingQuestion[];
};

export type DailyReading = {
  date: string;
  words: string[];
  stories: ReadingStory[];
};

const THEME_SETS = [
  ["动物冒险", "校园趣事", "奇幻魔法"],
  ["太空旅行", "海底探险", "欢乐运动会"],
  ["森林侦探", "小小厨师", "玩具王国"],
] as const;

function hash(text: string) {
  let value = 2166136261;
  for (const char of text) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return Math.abs(value);
}

function markedWord(word: string) {
  const syllables = splitSyllables(word);
  return syllables.length > 1 ? syllables.join("-") : word;
}

function joinWords(words: string[]) {
  if (words.length <= 1) return words[0] ?? "";
  if (words.length === 2) return `${words[0]} and ${words[1]}`;
  return `${words.slice(0, -1).join(", ")}, and ${words.at(-1)}`;
}

function wordQuestion(words: ReadingWord[], offset: number): ReadingQuestion {
  const target = words[offset % words.length];
  const distractors = ["cloud", "drum", "river"].filter(
    (word) => !words.some((item) => item.word === word),
  ).slice(0, 2);
  return {
    question: `Which one is a clue word in this story?`,
    options: [target.word, ...distractors],
    correctIndex: 0,
  };
}

function storyForTheme(
  theme: string,
  words: ReadingWord[],
  storyIndex: number,
): ReadingStory {
  const marked = words.map((item) => markedWord(item.word));
  const wordLine = joinWords(marked);
  const firstWord = words[storyIndex % words.length];
  const meaning = firstWord.definition?.trim() || "one of today's useful words";

  if (theme === "动物冒险" || theme === "森林侦探") {
    return {
      title: theme === "动物冒险" ? "Milo and the Secret Word Trail" : "The Forest Word Detectives",
      theme,
      content:
        `Milo the little fox finds a bright map under an old tree. The map says, “Follow the word trail!” ` +
        `On the first leaf he reads ${wordLine}. Milo says every word slowly and clearly. ` +
        `A rabbit, a bird, and a kind bear help him cross a stream. At sunset, the friends find a box of star stickers. ` +
        `Milo learns that brave friends and careful reading can solve a big problem.`,
      questions: [
        { question: "Who finds the map?", options: ["Milo the fox", "A teacher", "A robot"], correctIndex: 0 },
        { question: "Where is the map?", options: ["Under an old tree", "In a classroom", "On the moon"], correctIndex: 0 },
        { question: "Who helps Milo?", options: ["Animal friends", "Only a robot", "No one"], correctIndex: 0 },
        { question: "What is in the box?", options: ["Star stickers", "Hot soup", "A football"], correctIndex: 0 },
        wordQuestion(words, storyIndex),
      ],
    };
  }

  if (theme === "校园趣事" || theme === "欢乐运动会") {
    return {
      title: theme === "校园趣事" ? "The Funny Word Show" : "Words at Sports Day",
      theme,
      content:
        `Class Three has a special show today. Each child picks a card, and the cards say ${wordLine}. ` +
        `Ben reads too fast and his hat falls into a paint box. Everyone laughs, and Ben laughs too. ` +
        `Then the class uses every card in a short play. Their teacher gives them a golden paper star. ` +
        `The children learn that practice can be noisy, funny, and full of joy.`,
      questions: [
        { question: "What does Class Three have?", options: ["A special show", "A long test", "A picnic"], correctIndex: 0 },
        { question: "What falls into the paint box?", options: ["Ben's hat", "A book", "A cake"], correctIndex: 0 },
        { question: "What do the children make?", options: ["A short play", "A tall tower", "A new bike"], correctIndex: 0 },
        { question: "What does the teacher give them?", options: ["A paper star", "A red ball", "Some fish"], correctIndex: 0 },
        wordQuestion(words, storyIndex),
      ],
    };
  }

  if (theme === "奇幻魔法" || theme === "玩具王国") {
    return {
      title: theme === "奇幻魔法" ? "Luna's Three Magic Doors" : "The Toys That Learned to Read",
      theme,
      content:
        `Luna opens a tiny book and three magic doors appear. A silver owl says, “Read these words: ${wordLine}.” ` +
        `Luna reads each word, and the first door opens to a room of dancing pencils. The next door hides a sleepy dragon. ` +
        `Behind the last door is a warm light for her village. Luna takes the light home and shares it with everyone.`,
      questions: [
        { question: "How many magic doors appear?", options: ["Three", "One", "Ten"], correctIndex: 0 },
        { question: "Who speaks to Luna?", options: ["A silver owl", "A blue whale", "A teacher"], correctIndex: 0 },
        { question: "What dances in a room?", options: ["Pencils", "Shoes", "Trees"], correctIndex: 0 },
        { question: "What does Luna take home?", options: ["A warm light", "A dragon", "A door"], correctIndex: 0 },
        wordQuestion(words, storyIndex),
      ],
    };
  }

  const place = theme === "太空旅行" ? "a little space station" : theme === "海底探险" ? "a glass house under the sea" : "a busy kitchen";
  const helper = theme === "太空旅行" ? "a friendly robot" : theme === "海底探险" ? "a yellow fish" : "Grandma May";
  return {
    title: theme === "太空旅行" ? "The Word Rocket" : theme === "海底探险" ? "Nina and the Singing Shell" : "The Surprise Word Cake",
    theme,
    content:
      `Nina visits ${place}. There she meets ${helper}, who shows her a list: ${wordLine}. ` +
      `Nina reads the words and uses them as clues. One clue is “${markedWord(firstWord.word)},” which means ${meaning}. ` +
      `At last, she finds a small bell and rings it. Music fills the place, and everyone does a happy dance.`,
    questions: [
      { question: "Who is the main child?", options: ["Nina", "Milo", "Ben"], correctIndex: 0 },
      { question: "What does Nina use the words as?", options: ["Clues", "Food", "Toys"], correctIndex: 0 },
      { question: "What does Nina find?", options: ["A small bell", "A large boat", "A red kite"], correctIndex: 0 },
      { question: "What happens at the end?", options: ["Everyone dances", "Everyone sleeps", "It starts to snow"], correctIndex: 0 },
      wordQuestion(words, storyIndex),
    ],
  };
}

function distributeAnswers(story: ReadingStory, seed: string): ReadingStory {
  const startIndex = hash(seed) % 3;
  return {
    ...story,
    questions: story.questions.map((question, questionIndex) => {
      const correctOption = question.options[question.correctIndex];
      const otherOptions = question.options.filter(
        (_, optionIndex) => optionIndex !== question.correctIndex,
      );
      const correctIndex = (startIndex + questionIndex) % question.options.length;
      const options = [...otherOptions];
      options.splice(correctIndex, 0, correctOption);
      return { ...question, options, correctIndex };
    }),
  };
}

export function generateDailyReading(date: string, words: ReadingWord[]): DailyReading {
  const cleanWords = words
    .map((item) => ({ ...item, word: item.word.trim().toLowerCase() }))
    .filter((item) => /^[a-z][a-z'-]*$/.test(item.word));
  if (cleanWords.length === 0) {
    return { date, words: [], stories: [] };
  }
  const themes = THEME_SETS[hash(`${date}:${cleanWords.map((item) => item.word).join(",")}`) % THEME_SETS.length];
  return {
    date,
    words: cleanWords.map((item) => item.word),
    stories: themes.map((theme, index) =>
      distributeAnswers(
        storyForTheme(theme, cleanWords, index),
        `${date}:${cleanWords.map((item) => item.word).join(",")}:${theme}`,
      ),
    ),
  };
}
