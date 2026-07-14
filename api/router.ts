import { authRouter } from "./auth-router";
import { wordGroupRouter } from "./word-group-router";
import { wordRouter } from "./word-router";
import { tagRouter } from "./tag-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  wordGroup: wordGroupRouter,
  word: wordRouter,
  tag: tagRouter,
});

export type AppRouter = typeof appRouter;
