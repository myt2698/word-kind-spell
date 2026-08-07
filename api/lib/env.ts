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
  get aliyunSpeechAppKey() {
    return get("ALIYUN_SPEECH_APP_KEY") || "MhXjV6jWRgWGmdjb";
  },
  get aliyunAccessKeyId() { return get("ALIYUN_ACCESS_KEY_ID"); },
  get aliyunAccessKeySecret() { return get("ALIYUN_ACCESS_KEY_SECRET"); },
  get aliyunSpeechVoice() { return get("ALIYUN_SPEECH_VOICE"); },
  get restMediaDir() {
    return get("REST_MEDIA_DIR")
      || (process.env.NODE_ENV === "production" ? "/app/uploads/rest" : "./tmp/rest-media");
  },

  // Validate all required variables before starting the production server.
  validate() {
    const required = ["APP_SECRET", "DATABASE_URL"];
    const missing = required.filter((name) => !process.env[name]);
    if (missing.length > 0) {
      console.error(`[ENV ERROR] Missing: ${missing.join(", ")}`);
      throw new Error(`Missing required env vars: ${missing.join(", ")}`);
    }
    if ((process.env.APP_SECRET?.length ?? 0) < 32) {
      throw new Error("APP_SECRET must contain at least 32 characters");
    }
    console.log("[ENV] All required variables OK");
  },
};
