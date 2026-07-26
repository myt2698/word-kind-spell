import { spawnSync } from "node:child_process";
import path from "node:path";

// Backward-compatible entry point. The old importer duplicated rows and lost
// textbook/group/tag relationships, so all imports now use the validated shared
// catalog rebuild script.
const backupPath = process.argv[2] ?? path.resolve("wordmind-backup.json");
const extraArgs = process.argv.slice(3);
const rebuildScript = path.resolve("scripts/rebuild-shared-catalog.mjs");

const result = spawnSync(
  process.execPath,
  [rebuildScript, backupPath, ...extraArgs],
  {
    stdio: "inherit",
    env: process.env,
  }
);

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
