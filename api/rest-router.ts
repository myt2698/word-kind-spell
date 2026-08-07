import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { restVideoEpisodes, restVideoSeries } from "@db/schema";
import { adminQuery, authedQuery, createRouter } from "./middleware";
import { getDb } from "./queries/connection";
import { deleteRestMediaByUrl } from "./rest-media-http";

const mediaLocation = z
  .string()
  .trim()
  .min(1, "请填写媒体地址")
  .max(2048)
  .refine(
    (value) => /^https:\/\//i.test(value) || value.startsWith("/"),
    "请填写 HTTPS 地址或站内绝对路径",
  );

const seriesFields = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).optional(),
  coverUrl: mediaLocation,
  sortOrder: z.number().int().min(-9999).max(9999).default(0),
  enabled: z.boolean().default(true),
});

const episodeFields = z.object({
  seriesId: z.number().int().positive(),
  title: z.string().trim().min(1).max(150),
  episodeNumber: z.number().int().positive().max(9999),
  videoUrl: mediaLocation,
  durationSeconds: z.number().int().positive().max(86_400).nullable().optional(),
  enabled: z.boolean().default(true),
});

async function requireSeries(id: number) {
  const [series] = await getDb()
    .select({ id: restVideoSeries.id })
    .from(restVideoSeries)
    .where(eq(restVideoSeries.id, id))
    .limit(1);
  if (!series) {
    throw new TRPCError({ code: "NOT_FOUND", message: "短片系列不存在" });
  }
}

export const restRouter = createRouter({
  listSeries: authedQuery.query(async () => {
    const db = getDb();
    const series = await db
      .select()
      .from(restVideoSeries)
      .where(eq(restVideoSeries.enabled, true))
      .orderBy(asc(restVideoSeries.sortOrder), asc(restVideoSeries.id));
    const episodes = await db
      .select({ seriesId: restVideoEpisodes.seriesId })
      .from(restVideoEpisodes)
      .where(eq(restVideoEpisodes.enabled, true));
    const counts = new Map<number, number>();
    for (const episode of episodes) {
      counts.set(episode.seriesId, (counts.get(episode.seriesId) ?? 0) + 1);
    }
    return series
      .map((item) => ({ ...item, episodeCount: counts.get(item.id) ?? 0 }))
      .filter((item) => item.episodeCount > 0);
  }),

  getSeries: authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [series] = await db
        .select()
        .from(restVideoSeries)
        .where(and(eq(restVideoSeries.id, input.id), eq(restVideoSeries.enabled, true)))
        .limit(1);
      if (!series) {
        throw new TRPCError({ code: "NOT_FOUND", message: "短片系列不存在或已下架" });
      }
      const episodes = await db
        .select()
        .from(restVideoEpisodes)
        .where(and(
          eq(restVideoEpisodes.seriesId, input.id),
          eq(restVideoEpisodes.enabled, true),
        ))
        .orderBy(asc(restVideoEpisodes.episodeNumber), asc(restVideoEpisodes.id));
      return { ...series, episodeCount: episodes.length, episodes };
    }),

  adminList: adminQuery.query(async () => {
    const db = getDb();
    const series = await db
      .select()
      .from(restVideoSeries)
      .orderBy(asc(restVideoSeries.sortOrder), asc(restVideoSeries.id));
    const episodes = await db
      .select()
      .from(restVideoEpisodes)
      .orderBy(asc(restVideoEpisodes.episodeNumber), asc(restVideoEpisodes.id));
    return series.map((item) => {
      const itemEpisodes = episodes.filter((episode) => episode.seriesId === item.id);
      return { ...item, episodeCount: itemEpisodes.length, episodes: itemEpisodes };
    });
  }),

  createSeries: adminQuery.input(seriesFields).mutation(async ({ input }) => {
    const result = await getDb().insert(restVideoSeries).values({
      ...input,
      description: input.description || null,
    });
    return { id: Number(result[0].insertId) };
  }),

  updateSeries: adminQuery
    .input(seriesFields.extend({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { id, ...fields } = input;
      await requireSeries(id);
      const [existing] = await getDb()
        .select({ coverUrl: restVideoSeries.coverUrl })
        .from(restVideoSeries)
        .where(eq(restVideoSeries.id, id))
        .limit(1);
      await getDb().update(restVideoSeries).set({
        ...fields,
        description: fields.description || null,
      }).where(eq(restVideoSeries.id, id));
      if (existing?.coverUrl !== fields.coverUrl) {
        await deleteRestMediaByUrl(existing?.coverUrl);
      }
      return { success: true };
    }),

  deleteSeries: adminQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const [series] = await getDb()
        .select({ coverUrl: restVideoSeries.coverUrl })
        .from(restVideoSeries)
        .where(eq(restVideoSeries.id, input.id))
        .limit(1);
      const episodes = await getDb()
        .select({ videoUrl: restVideoEpisodes.videoUrl })
        .from(restVideoEpisodes)
        .where(eq(restVideoEpisodes.seriesId, input.id));
      await getDb().delete(restVideoSeries).where(eq(restVideoSeries.id, input.id));
      await Promise.all([
        deleteRestMediaByUrl(series?.coverUrl),
        ...episodes.map((episode) => deleteRestMediaByUrl(episode.videoUrl)),
      ]);
      return { success: true };
    }),

  createEpisode: adminQuery.input(episodeFields).mutation(async ({ input }) => {
    await requireSeries(input.seriesId);
    const result = await getDb().insert(restVideoEpisodes).values({
      ...input,
      durationSeconds: input.durationSeconds ?? null,
    });
    return { id: Number(result[0].insertId) };
  }),

  updateEpisode: adminQuery
    .input(episodeFields.extend({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { id, ...fields } = input;
      await requireSeries(fields.seriesId);
      const [existing] = await getDb()
        .select({ videoUrl: restVideoEpisodes.videoUrl })
        .from(restVideoEpisodes)
        .where(eq(restVideoEpisodes.id, id))
        .limit(1);
      await getDb().update(restVideoEpisodes).set({
        ...fields,
        durationSeconds: fields.durationSeconds ?? null,
      }).where(eq(restVideoEpisodes.id, id));
      if (existing?.videoUrl !== fields.videoUrl) {
        await deleteRestMediaByUrl(existing?.videoUrl);
      }
      return { success: true };
    }),

  deleteEpisode: adminQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const [episode] = await getDb()
        .select({ videoUrl: restVideoEpisodes.videoUrl })
        .from(restVideoEpisodes)
        .where(eq(restVideoEpisodes.id, input.id))
        .limit(1);
      await getDb().delete(restVideoEpisodes).where(eq(restVideoEpisodes.id, input.id));
      await deleteRestMediaByUrl(episode?.videoUrl);
      return { success: true };
    }),
});
