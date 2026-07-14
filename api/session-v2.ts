/**
 * Session Management V2 - Based on userId (for phone auth)
 */

import * as jose from "jose";
import { env } from "./lib/env";

const JWT_ALG = "HS256";
const JWT_SECRET = () => new TextEncoder().encode(env.appSecret + "_phone_v2");

export type PhoneSessionPayload = {
  userId: number;
  phone: string;
  iat: number;
  exp: number;
};

export async function signPhoneSessionToken(
  userId: number,
  phone: string
): Promise<string> {
  return new jose.SignJWT({ userId, phone })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime("1 year")
    .sign(JWT_SECRET());
}

export async function verifyPhoneSessionToken(
  token: string
): Promise<{ userId: number; phone: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET(), {
      algorithms: [JWT_ALG],
      clockTolerance: 60,
    });
    if (!payload.userId || !payload.phone) return null;
    return {
      userId: payload.userId as number,
      phone: payload.phone as string,
    };
  } catch {
    return null;
  }
}
