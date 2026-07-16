/**
 * Session Management V2 - Based on userId + name
 */

import * as jose from "jose";
import { env } from "./lib/env";

const JWT_ALG = "HS256";
const JWT_SECRET = () => new TextEncoder().encode(env.appSecret + "_name_v2");

export type NameSessionPayload = {
  userId: number;
  name: string;
  iat: number;
  exp: number;
};

export async function signPhoneSessionToken(
  userId: number,
  name: string
): Promise<string> {
  return new jose.SignJWT({ userId, name })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime("1 year")
    .sign(JWT_SECRET());
}

export async function verifyPhoneSessionToken(
  token: string
): Promise<{ userId: number; name: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET(), {
      algorithms: [JWT_ALG],
      clockTolerance: 60,
    });
    if (!payload.userId || !payload.name) return null;
    return {
      userId: payload.userId as number,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}
