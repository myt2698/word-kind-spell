import { relations } from "drizzle-orm";
import { users, textbooks, wordGroups, words, wordGroupLinks, tags, wordTags, wordLogs, wordSpellings, spellingErrors, spellingSessions, restVideoSeries, restVideoEpisodes } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  textbooks: many(textbooks),
  wordGroups: many(wordGroups),
  words: many(words),
  tags: many(tags),
  wordLogs: many(wordLogs),
  wordSpellings: many(wordSpellings),
  spellingErrors: many(spellingErrors),
  spellingSessions: many(spellingSessions),
}));

export const textbooksRelations = relations(textbooks, ({ one, many }) => ({
  user: one(users, { fields: [textbooks.userId], references: [users.id] }),
  wordGroups: many(wordGroups),
}));

export const wordGroupsRelations = relations(wordGroups, ({ one, many }) => ({
  user: one(users, { fields: [wordGroups.userId], references: [users.id] }),
  textbook: one(textbooks, { fields: [wordGroups.textbookId], references: [textbooks.id] }),
  words: many(words),
  wordGroupLinks: many(wordGroupLinks),
}));

export const wordsRelations = relations(words, ({ one, many }) => ({
  user: one(users, { fields: [words.userId], references: [users.id] }),
  group: one(wordGroups, { fields: [words.groupId], references: [wordGroups.id] }),
  wordGroupLinks: many(wordGroupLinks),
  wordTags: many(wordTags),
  logs: many(wordLogs),
  wordSpellings: many(wordSpellings),
  spellingErrors: many(spellingErrors),
}));

export const wordGroupLinksRelations = relations(wordGroupLinks, ({ one }) => ({
  word: one(words, { fields: [wordGroupLinks.wordId], references: [words.id] }),
  group: one(wordGroups, { fields: [wordGroupLinks.groupId], references: [wordGroups.id] }),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, { fields: [tags.userId], references: [users.id] }),
  wordTags: many(wordTags),
}));

export const wordTagsRelations = relations(wordTags, ({ one }) => ({
  word: one(words, { fields: [wordTags.wordId], references: [words.id] }),
  tag: one(tags, { fields: [wordTags.tagId], references: [tags.id] }),
}));

export const wordLogsRelations = relations(wordLogs, ({ one }) => ({
  word: one(words, { fields: [wordLogs.wordId], references: [words.id] }),
  user: one(users, { fields: [wordLogs.userId], references: [users.id] }),
}));

export const wordSpellingsRelations = relations(wordSpellings, ({ one }) => ({
  word: one(words, { fields: [wordSpellings.wordId], references: [words.id] }),
  user: one(users, { fields: [wordSpellings.userId], references: [users.id] }),
}));

export const spellingErrorsRelations = relations(spellingErrors, ({ one }) => ({
  word: one(words, { fields: [spellingErrors.wordId], references: [words.id] }),
  user: one(users, { fields: [spellingErrors.userId], references: [users.id] }),
}));

export const spellingSessionsRelations = relations(spellingSessions, ({ one }) => ({
  user: one(users, { fields: [spellingSessions.userId], references: [users.id] }),
}));

export const restVideoSeriesRelations = relations(restVideoSeries, ({ many }) => ({
  episodes: many(restVideoEpisodes),
}));

export const restVideoEpisodesRelations = relations(restVideoEpisodes, ({ one }) => ({
  series: one(restVideoSeries, {
    fields: [restVideoEpisodes.seriesId],
    references: [restVideoSeries.id],
  }),
}));
