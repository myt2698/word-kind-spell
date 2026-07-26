import "dotenv/config";

// Lazy env: checks happen on first access, not module load
// This allows debug logging in boot.ts before env validation
const cache: Record<string, string> = {};

function get(name: string): string {
  if (cache[name] !== undefined) return cache[name];
  const value = process.env[name] ?? "";
  cache[name] = value;
  return value;
}

export const env = {
  get appId() { return get("APP_ID"); },
  get appSecret() { return get("APP_SECRET"); },
  get isProduction() { return process.env.NODE_ENV === "production"; },
  get databaseUrl() { return get("DATABASE_URL"); },
  get kimiAuthUrl() { return get("KIMI_AUTH_URL"); },
  get kimiOpenUrl() { return get("KIMI_OPEN_URL"); },
  get ownerUnionId() { return process.env.OWNER_UNION_ID ?? ""; },
  get catalogOwnerUserId() { return process.env.CATALOG_OWNER_USER_ID ?? ""; },
  get youdaoAppKey() { return process.env.YOUDAO_APP_KEY ?? ""; },
  get youdaoAppSecret() { return process.env.YOUDAO_APP_SECRET ?? ""; },

  // Validate all required vars, call this after debug logging
  validate() {
    const required = ["APP_ID", "APP_SECRET", "DATABASE_URL", "KIMI_AUTH_URL", "KIMI_OPEN_URL"];
    const missing = required.filter((name) => !process.env[name]);
    if (missing.length > 0) {
      const available = Object.keys(process.env)
        .filter((k) => !k.includes("SECRET") && !k.includes("PASS") && !k.includes("KEY"))
        .sort();
      console.error(`[ENV ERROR] Missing: ${missing.join(", ")}`);
      console.error(`[ENV DEBUG] Available (${Object.keys(process.env).length}): ${available.join(", ")}`);
      throw new Error(`Missing required env vars: ${missing.join(", ")}`);
    }
    console.log("[ENV] All required variables OK");
  },
};
