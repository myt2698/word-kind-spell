/**
 * Name + Password Authentication Module
 * 使用昵称+密码登录注册，昵称唯一
 */

import bcrypt from "bcryptjs";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 10;

function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Register a new user with name and password
 */
export async function register(
  name: string,
  password: string
): Promise<{
  success: boolean;
  userId?: number;
  message?: string;
}> {
  try {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, message: "请输入昵称" };
    }
    if (trimmedName.length > 20) {
      return { success: false, message: "昵称最多20个字符" };
    }

    if (!isValidPassword(password)) {
      return { success: false, message: "密码至少6位字符" };
    }

    const db = getDb();

    // Check if name already exists
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.name, trimmedName))
      .limit(1);

    if (existing.length > 0) {
      return { success: false, message: "该昵称已被使用，请换一个" };
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    console.log("[auth] Register - name:", trimmedName, "hash length:", passwordHash.length);

    const result = await db.insert(users).values({
      name: trimmedName,
      password: passwordHash,
      lastSignInAt: new Date(),
    });

    const userId = Number(result[0].insertId);
    console.log("[auth] Register success - userId:", userId);
    return { success: true, userId, message: "注册成功" };
  } catch (err: any) {
    console.error("[auth] Register exception:", err);
    // Handle unique constraint violation
    if (err.message?.includes("Duplicate") || err.message?.includes("unique")) {
      return { success: false, message: "该昵称已被使用，请换一个" };
    }
    return { success: false, message: "注册异常: " + (err.message || "未知错误") };
  }
}

/**
 * Login with name and password
 */
export async function login(
  name: string,
  password: string
): Promise<{
  success: boolean;
  userId?: number;
  message?: string;
}> {
  try {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, message: "请输入昵称" };
    }
    if (!password) {
      return { success: false, message: "请输入密码" };
    }

    const db = getDb();

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        password: users.password,
      })
      .from(users)
      .where(eq(users.name, trimmedName))
      .limit(1);

    const user = rows[0] || null;

    console.log("[auth] Login - name:", trimmedName, "user found:", !!user);

    if (!user) {
      return { success: false, message: "昵称不存在，请先注册" };
    }

    if (!user.password) {
      return { success: false, message: "账号异常，请联系管理员" };
    }

    const valid = await verifyPassword(password, user.password);
    console.log("[auth] Login - password valid:", valid);

    if (!valid) {
      return { success: false, message: "密码错误" };
    }

    // Update last sign in
    await db
      .update(users)
      .set({ lastSignInAt: new Date() })
      .where(eq(users.id, user.id));

    console.log("[auth] Login success - userId:", user.id);
    return { success: true, userId: user.id, message: "登录成功" };
  } catch (err: any) {
    console.error("[auth] Login exception:", err);
    return { success: false, message: "登录异常: " + (err.message || "未知错误") };
  }
}

/**
 * Change password
 */
export async function changePassword(
  userId: number,
  oldPassword: string,
  newPassword: string
): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    if (!isValidPassword(newPassword)) {
      return { success: false, message: "新密码至少6位字符" };
    }

    const db = getDb();

    const rows = await db
      .select({ password: users.password })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const user = rows[0];

    if (!user || !user.password) {
      return { success: false, message: "用户不存在" };
    }

    const valid = await verifyPassword(oldPassword, user.password);
    if (!valid) {
      return { success: false, message: "原密码错误" };
    }

    const newHash = await hashPassword(newPassword);
    await db
      .update(users)
      .set({ password: newHash })
      .where(eq(users.id, userId));

    return { success: true, message: "密码修改成功" };
  } catch (err: any) {
    console.error("[auth] Change password exception:", err);
    return { success: false, message: "修改异常: " + (err.message || "未知错误") };
  }
}

/**
 * Find user by ID (excludes password)
 */
export async function findUserById(userId: number) {
  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      unionId: users.unionId,
      phone: users.phone,
      name: users.name,
      email: users.email,
      avatar: users.avatar,
      defaultGroupId: users.defaultGroupId,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastSignInAt: users.lastSignInAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0] || null;
}
