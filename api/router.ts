import { authRouter } from "./auth-router";
import { wordGroupRouter } from "./word-group-router";
import { wordRouter } from "./word-router";
import { tagRouter } from "./tag-router";
import { dictRouter } from "./dict-router";
import { spellingRouter } from "./spelling-router";
import { textbookRouter } from "./textbook-router";
import { audioRouter } from "./audio-router";
import { restRouter } from "./rest-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({
    ok: true,
    ts: Date.now(),
    release: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
  })),
  auth: authRouter,
  wordGroup: wordGroupRouter,
  word: wordRouter,
  tag: tagRouter,
  dict: dictRouter,
  spelling: spellingRouter,
  textbook: textbookRouter,
  audio: audioRouter,
  rest: restRouter,
});

export type AppRouter = typeof appRouter;
