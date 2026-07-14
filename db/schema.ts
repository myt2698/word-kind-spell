import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  int,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  password: varchar("password", { length: 255 }),
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
  uniqueIndex("phone_idx").on(table.phone),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// 单词分组表
export const wordGroups = mysqlTable("word_groups", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
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
