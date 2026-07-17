import { createRouter, publicQuery } from "./middleware";
import { wordRouter } from "./word-router";
import { tagRouter } from "./tag-router";
import { textbookRouter } from "./textbook-router";
import { wordGroupRouter } from "./word-group-router";
import { spellingRouter } from "./spelling-router";
import { dictRouter } from "./dict-router";
import { adminRouter } from "./admin-router";

export const appRouter = createRouter({
  word: wordRouter,
  tag: tagRouter,
  textbook: textbookRouter,
  group: wordGroupRouter,
  spelling: spellingRouter,
  dict: dictRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
