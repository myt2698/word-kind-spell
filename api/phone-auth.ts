/**
 * Phone Password Authentication Module
 */

import bcrypt from "bcryptjs";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 10;

function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

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
 * Register a new user with phone and password
 */
export async function register(
  phone: string,
  password: string,
  name?: string
): Promise<{
  success: boolean;
  userId?: number;
  message?: string;
}> {
  try {
    if (!isValidPhone(phone)) {
      return { success: false, message: "请输入有效的手机号" };
    }

    if (!isValidPassword(password)) {
      return { success: false, message: "密码至少6位字符" };
    }

    const db = getDb();

    // Check if phone already registered
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1)
      .then((rows) => rows[0] || null);

    if (existing) {
      return { success: false, message: "该手机号已注册，请直接登录" };
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    console.log("[auth] Register - phone:", phone, "hash length:", passwordHash.length);

    const result = await db.insert(users).values({
      phone,
      password: passwordHash,
      name: name || `用户${phone.slice(-4)}`,
      lastSignInAt: new Date(),
    });

    const userId = Number(result[0].insertId);
    console.log("[auth] Register success - userId:", userId);
    return { success: true, userId, message: "注册成功" };
  } catch (err: any) {
    console.error("[auth] Register exception:", err);
    return { success: false, message: "注册异常: " + (err.message || "未知错误") };
  }
}

/**
 * Login with phone and password
 */
export async function login(
  phone: string,
  password: string
): Promise<{
  success: boolean;
  userId?: number;
  message?: string;
}> {
  try {
    if (!isValidPhone(phone)) {
      return { success: false, message: "请输入有效的手机号" };
    }

    if (!password) {
      return { success: false, message: "请输入密码" };
    }

    const db = getDb();

    // Explicitly select password field to ensure it's included
    const rows = await db
      .select({
        id: users.id,
        phone: users.phone,
        password: users.password,
      })
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    const user = rows[0] || null;

    console.log("[auth] Login - phone:", phone, "user found:", !!user);

    if (!user) {
      return { success: false, message: "手机号未注册" };
    }

    if (!user.password) {
      console.log("[auth] Login - user has no password, userId:", user.id);
      return { success: false, message: "账号异常，请联系管理员" };
    }

    console.log("[auth] Login - verifying password, hash length:", user.password.length);
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
