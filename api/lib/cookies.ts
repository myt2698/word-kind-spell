import type { CookieOptions } from "hono/utils/cookie";

export function getSessionCookieOptions(headers: Headers): CookieOptions {
  const host = headers.get("host") || "";
  const localhost = host.startsWith("localhost:") || host.startsWith("127.0.0.1:");

  return {
    httpOnly: true,
    path: "/",
    sameSite: "Lax",
    secure: !localhost,
  };
}
