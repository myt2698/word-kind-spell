import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import {
  register as registerUser,
  login as loginUser,
  changePassword as changeUserPassword,
  updateName as updateUserName,
} from "./phone-auth";
import { signPhoneSessionToken } from "./session-v2";
import { getSessionCookieOptions } from "./lib/cookies";
import { Session } from "@contracts/constants";
import * as cookie from "cookie";

export const authRouter = createRouter({
  // Register with name + password
  register: publicQuery
    .input(
      z.object({
        name: z.string().min(1, "请输入昵称").max(20, "昵称最多20个字符"),
        password: z.string().min(6, "密码至少6位字符"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await registerUser(input.name, input.password);
        if (!result.success || !result.userId) {
          return { success: false as const, message: result.message || "注册失败" };
        }

        // Generate session token and set cookie
        const token = await signPhoneSessionToken(result.userId, input.name);
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

        return { success: true as const, message: "注册成功" };
      } catch (err: any) {
        console.error("[auth] Register error:", err);
        return { success: false as const, message: "注册失败: " + (err.message || "未知错误") };
      }
    }),

  // Login with name + password
  login: publicQuery
    .input(
      z.object({
        name: z.string().min(1, "请输入昵称"),
        password: z.string().min(1, "请输入密码"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await loginUser(input.name, input.password);
        if (!result.success || !result.userId) {
          return { success: false as const, message: result.message || "登录失败" };
        }

        // Generate session token and set cookie
        const token = await signPhoneSessionToken(result.userId, input.name);
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

        return { success: true as const, message: "登录成功" };
      } catch (err: any) {
        console.error("[auth] Login error:", err);
        return { success: false as const, message: "登录失败: " + (err.message || "未知错误") };
      }
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
      try {
        const result = await changeUserPassword(
          ctx.user.id,
          input.oldPassword,
          input.newPassword
        );
        return result;
      } catch (err: any) {
        console.error("[auth] Change password error:", err);
        return { success: false, message: "修改失败: " + (err.message || "未知错误") };
      }
    }),

  // Change the unique nickname used for login
  updateName: authedQuery
    .input(
      z.object({
        name: z.string().trim().min(1, "请输入昵称").max(20, "昵称最多20个字符"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await updateUserName(ctx.user.id, input.name);
        if (!result.success || !result.name) return result;

        // Keep the long-lived session payload consistent with the renamed account.
        const token = await signPhoneSessionToken(ctx.user.id, result.name);
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

        return result;
      } catch (err: unknown) {
        console.error("[auth] Update name error:", err);
        const message = err instanceof Error ? err.message : "未知错误";
        return { success: false, message: "修改失败: " + message };
      }
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
