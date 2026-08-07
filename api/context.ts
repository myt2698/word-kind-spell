import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { verifyPhoneSessionToken } from "./session-v2";
import { findUserById } from "./phone-auth";
import { Session } from "@contracts/constants";
import * as cookie from "cookie";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: Omit<User, "password">;
};

export async function getRequestUser(
  req: Request,
): Promise<Omit<User, "password"> | undefined> {
  try {
    const cookies = cookie.parse(req.headers.get("cookie") || "");
    const token = cookies[Session.cookieName];
    if (!token) return undefined;

    const session = await verifyPhoneSessionToken(token);
    if (!session) return undefined;
    return await findUserById(session.userId) ?? undefined;
  } catch {
    return undefined;
  }
}

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };

  ctx.user = await getRequestUser(opts.req);

  return ctx;
}
