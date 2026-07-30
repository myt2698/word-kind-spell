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

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };

  try {
    const cookies = cookie.parse(opts.req.headers.get("cookie") || "");
    const token = cookies[Session.cookieName];
    if (token) {
      const session = await verifyPhoneSessionToken(token);
      if (session) {
        const user = await findUserById(session.userId);
        if (user) {
          ctx.user = user;
        }
      }
    }
  } catch {
    // Authentication is optional
  }

  return ctx;
}
