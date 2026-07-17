import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  int,
  boolean,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  password: varchar("password", { length: 255 }),
  // 昵称（必填，唯一，作为登录凭证）
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  defaultGroupId: bigint("defaultGroupId", { mode: "number", unsigned: true }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("name_idx").on(table.name),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// 课本表
export const textbooks = mysqlTable("textbooks", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  // isDefault=1 表示"扩展词汇"默认课本，不显示在管理列表中
  isDefault: boolean("isDefault").default(false).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Textbook = typeof textbooks.$inferSelect;
export type InsertTextbook = typeof textbooks.$inferInsert;

// 单词分组表（单元）
export const wordGroups = mysqlTable("word_groups", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  textbookId: bigint("textbookId", { mode: "number", unsigned: true })
    .references(() => textbooks.id, { onDelete: "set null" }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type WordGroup = typeof wordGroups.$inferSelect;
export type InsertWordGroup = typeof wordGroups.$inferInsert;

// 单词表
export const words = mysqlTable("words", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  groupId: bigint("groupId", { mode: "number", unsigned: true }).references(
    () => wordGroups.id,
    { onDelete: "set null" }
  ),
  word: varchar("word", { length: 255 }).notNull(),
  phonetic: varchar("phonetic", { length: 255 }),
  definition: text("definition").notNull(),
  example: text("example"),
  notes: text("notes"),
  proficiency: mysqlEnum("proficiency", ["new", "learning", "familiar", "mastered"])
    .default("new")
    .notNull(),
  // 学习状态：idle=未学(默认) active=学习中 paused=暂停
  learningStatus: mysqlEnum("learningStatus", ["idle", "active", "paused"])
    .default("idle")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Word = typeof words.$inferSelect;
export type InsertWord = typeof words.$inferInsert;

// 标签表
export const tags = mysqlTable("tags", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

// 单词-标签关联表
export const wordTags = mysqlTable("word_tags", {
  id: serial("id").primaryKey(),
  wordId: bigint("wordId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => words.id, { onDelete: "cascade" }),
  tagId: bigint("tagId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WordTag = typeof wordTags.$inferSelect;
export type InsertWordTag = typeof wordTags.$inferInsert;

// 学习日志表
export const wordLogs = mysqlTable("word_logs", {
  id: serial("id").primaryKey(),
  wordId: bigint("wordId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => words.id, { onDelete: "cascade" }),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  action: mysqlEnum("action", ["create", "review", "edit", "test_pass", "test_fail"])
    .notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WordLog = typeof wordLogs.$inferSelect;
export type InsertWordLog = typeof wordLogs.$inferInsert;

// ========== 拼写练习相关表 ==========

// 单词拼写复习状态表（艾宾浩斯遗忘曲线）
export const wordSpellings = mysqlTable("word_spellings", {
  id: serial("id").primaryKey(),
  wordId: bigint("wordId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => words.id, { onDelete: "cascade" }),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // 熟练度等级：1=陌生(拔高) 2=熟悉(中等) 3=掌握(基础)
  level: int("level").default(1).notNull(),
  // 下次复习时间
  nextReviewAt: timestamp("nextReviewAt").defaultNow().notNull(),
  // 上次复习时间
  lastReviewAt: timestamp("lastReviewAt"),
  // 连续正确次数
  streak: int("streak").default(0).notNull(),
  // 累计错误次数
  errorCount: int("errorCount").default(0).notNull(),
  // 总练习次数
  totalAttempts: int("totalAttempts").default(0).notNull(),
  // 总正确次数
  totalCorrect: int("totalCorrect").default(0).notNull(),
  // 来源：auto=系统自动(默认) manual=用户手动加入学习
  source: mysqlEnum("source", ["auto", "manual"])
    .default("auto")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type WordSpelling = typeof wordSpellings.$inferSelect;
export type InsertWordSpelling = typeof wordSpellings.$inferInsert;

// 拼写错误记录表（错题本）
export const spellingErrors = mysqlTable("spelling_errors", {
  id: serial("id").primaryKey(),
  wordId: bigint("wordId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => words.id, { onDelete: "cascade" }),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // 用户输入的错误拼写
  userInput: varchar("userInput", { length: 255 }).notNull(),
  // 错误类型：wrong_letter=字母错误, wrong_order=顺序错误, missing_letter=漏字母, extra_letter=多字母
  errorType: mysqlEnum("errorType", ["wrong_letter", "wrong_order", "missing_letter", "extra_letter", "other"])
    .default("other")
    .notNull(),
  // 出错的字母位置（JSON数组）
  errorPositions: text("errorPositions"),
  // 练习模式
  practiceMode: mysqlEnum("practiceMode", ["blocks", "fillblank", "flash"])
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SpellingError = typeof spellingErrors.$inferSelect;
export type InsertSpellingError = typeof spellingErrors.$inferInsert;

// 练习会话记录表
export const spellingSessions = mysqlTable("spelling_sessions", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // 练习模式
  mode: mysqlEnum("mode", ["blocks", "fillblank", "flash"]).notNull(),
  // 练习的单词数量
  wordCount: int("wordCount").default(0).notNull(),
  // 正确数量
  correctCount: int("correctCount").default(0).notNull(),
  // 用时（秒）
  duration: int("duration"),
  // 练习的单词IDs（JSON）
  wordIds: text("wordIds"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SpellingSession = typeof spellingSessions.$inferSelect;
export type InsertSpellingSession = typeof spellingSessions.$inferInsert;
