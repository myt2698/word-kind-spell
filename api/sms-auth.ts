/**
 * SMS Authentication Module
 * 
 * Development: Verification code is always "123456"
 * Production: Integrate with SMS provider (Aliyun, Tencent Cloud, etc.)
 */

import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

// In-memory verification code store: phone -> { code, expiresAt }
const codeStore = new Map<string, { code: string; expiresAt: number }>();

const CODE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const CODE_LENGTH = 6;

function generateCode(): string {
  // Development environment: always return 123456
  if (process.env.NODE_ENV !== "production") {
    return "123456";
  }
  // Production: generate random code
  return Array.from({ length: CODE_LENGTH }, () =>
    Math.floor(Math.random() * 10)
  ).join("");
}

function isValidPhone(phone: string): boolean {
  // Chinese mobile phone validation
  return /^1[3-9]\d{9}$/.test(phone);
}

/**
 * Send verification code to phone number
 * Returns the code (for development only)
 */
export async function sendVerificationCode(phone: string): Promise<{
  success: boolean;
  message: string;
  devCode?: string;
}> {
  if (!isValidPhone(phone)) {
    return { success: false, message: "请输入有效的手机号" };
  }

  // Check if code was sent recently (cooldown: 60s)
  const existing = codeStore.get(phone);
  if (existing && Date.now() - (existing.expiresAt - CODE_EXPIRY_MS) < 60000) {
    return { success: false, message: "请稍后再试，验证码发送过于频繁" };
  }

  const code = generateCode();
  const expiresAt = Date.now() + CODE_EXPIRY_MS;

  codeStore.set(phone, { code, expiresAt });

  // TODO: Production - integrate with SMS provider here
  // Example: Aliyun SMS, Tencent Cloud SMS, etc.
  // await sendSmsViaProvider(phone, code);

  console.log(`[SMS] Verification code for ${phone}: ${code}`);

  return {
    success: true,
    message: "验证码已发送",
    devCode: process.env.NODE_ENV !== "production" ? code : undefined,
  };
}

/**
 * Verify the code and return user
 */
export async function verifyCode(
  phone: string,
  code: string
): Promise<{
  success: boolean;
  userId?: number;
  message?: string;
}> {
  if (!isValidPhone(phone)) {
    return { success: false, message: "手机号格式不正确" };
  }

  if (!code || code.length !== CODE_LENGTH) {
    return { success: false, message: "请输入6位验证码" };
  }

  const record = codeStore.get(phone);

  if (!record) {
    return { success: false, message: "验证码已过期，请重新获取" };
  }

  if (Date.now() > record.expiresAt) {
    codeStore.delete(phone);
    return { success: false, message: "验证码已过期，请重新获取" };
  }

  if (record.code !== code) {
    return { success: false, message: "验证码错误" };
  }

  // Code verified - clean up
  codeStore.delete(phone);

  // Find or create user
  const db = getDb();
  let user = await db
    .select()
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1)
    .then((rows) => rows[0] || null);

  if (!user) {
    // Create new user
    const result = await db.insert(users).values({
      phone,
      name: `用户${phone.slice(-4)}`,
      lastSignInAt: new Date(),
    });
    const userId = Number(result[0].insertId);
    return { success: true, userId };
  }

  // Update last sign in
  await db
    .update(users)
    .set({ lastSignInAt: new Date() })
    .where(eq(users.id, user.id));

  return { success: true, userId: user.id };
}

/**
 * Find user by ID
 */
export async function findUserById(userId: number) {
  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0] || null;
}
