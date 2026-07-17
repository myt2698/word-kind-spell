import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { verifyPhoneSessionToken } from "./session-v2";
import { findUserById } from "./phone-auth";

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
    const cookies = opts.req.headers.get("cookie") || "";
    const match = cookies.match(/kimi_sid=([^;]+)/);
    if (match) {
      const session = await verifyPhoneSessionToken(decodeURIComponent(match[1]));
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
