import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { register, login, changePassword } from "./phone-auth";
import { signPhoneSessionToken } from "./session-v2";
import { getSessionCookieOptions } from "./lib/cookies";
import { Session } from "@contracts/constants";
import * as cookie from "cookie";

export const authRouter = createRouter({
  // Register with phone + password
  register: publicQuery
    .input(
      z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入有效的手机号"),
        password: z.string().min(6, "密码至少6位字符"),
        name: z.string().max(50).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await register(input.phone, input.password, input.name);
      if (!result.success || !result.userId) {
        return { success: false, message: result.message || "注册失败" };
      }

      // Generate session token and set cookie
      const token = await signPhoneSessionToken(result.userId, input.phone);
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

      return { success: true, message: "注册成功" };
    }),

  // Login with phone + password
  login: publicQuery
    .input(
      z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入有效的手机号"),
        password: z.string().min(1, "请输入密码"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await login(input.phone, input.password);
      if (!result.success || !result.userId) {
        return { success: false, message: result.message || "登录失败" };
      }

      // Generate session token and set cookie
      const token = await signPhoneSessionToken(result.userId, input.phone);
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

  // Get current user info (without password)
  me: authedQuery.query((opts) => opts.ctx.user),

  // Change password
  changePassword: authedQuery
    .input(
      z.object({
        oldPassword: z.string().min(1, "请输入原密码"),
        newPassword: z.string().min(6, "新密码至少6位字符"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await changePassword(
        ctx.user.id,
        input.oldPassword,
        input.newPassword
      );
      return result;
    }),

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
