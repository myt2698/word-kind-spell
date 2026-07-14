import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { sendVerificationCode, verifyCode } from "./sms-auth";
import { signPhoneSessionToken } from "./session-v2";
import { getSessionCookieOptions } from "./lib/cookies";
import { Session } from "@contracts/constants";
import * as cookie from "cookie";

export const authRouter = createRouter({
  // Send verification code
  sendCode: publicQuery
    .input(z.object({ phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入有效的手机号") }))
    .mutation(async ({ input }) => {
      const result = await sendVerificationCode(input.phone);
      return result;
    }),

  // Login with verification code
  login: publicQuery
    .input(
      z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入有效的手机号"),
        code: z.string().length(6, "请输入6位验证码"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await verifyCode(input.phone, input.code);
      if (!result.success || !result.userId) {
        return { success: false, message: result.message || "登录失败" };
      }

      // Generate session token
      const token = await signPhoneSessionToken(result.userId, input.phone);

      // Set cookie
      const cookieOpts = getSessionCookieOptions(ctx.req.headers);
      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize(Session.cookieName, token, {
          httpOnly: cookieOpts.httpOnly,
          path: cookieOpts.path,
          sameSite: cookieOpts.sameSite?.toLowerCase() as "lax" | "none",
          secure: cookieOpts.secure,
          maxAge: Session.maxAgeMs / 1000,
        })
      );

      return { success: true, message: "登录成功" };
    }),

  // Get current user info
  me: authedQuery.query((opts) => opts.ctx.user),

  // Logout
  logout: authedQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      })
    );
    return { success: true };
  }),
});
