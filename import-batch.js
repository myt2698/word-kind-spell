import fs from "fs";
import mysql from "mysql2/promise";

const DATABASE_URL = "mysql://root:FLbtIshYZsJmzgCTdDOSdHJKirzervdu@kodama.proxy.rlwy.net:24132/railway";
const USER_ID = 2;

const backup = JSON.parse(fs.readFileSync("./wordmind-backup.json", "utf-8"));
const words = JSON.parse(backup.words).result.data.json;
const groups = JSON.parse(backup.groups).result.data.json;
const tags = JSON.parse(backup.tags).result.data.json;

async function main() {
  console.log(`📦 导入: ${words.length} 单词, ${groups.length} 课本, ${tags.length} 标签\n`);

  const conn = await mysql.createConnection({ uri: DATABASE_URL, connectTimeout: 30000 });
  console.log("✅ 数据库连接成功\n");

  try {
    // Groups
    console.log("📚 Groups...");
    for (const g of groups) {
      await conn.execute(
        "INSERT INTO word_groups (name, description, sortOrder, userId, textbookId) VALUES (?, ?, ?, ?, ?)",
        [g.name, g.description || "", g.sortOrder || 0, USER_ID, null]
      );
    }
    console.log(`   ✅ ${groups.length} 个`);

    // Tags
    console.log("\n🏷️ Tags...");
    for (const t of tags) {
      await conn.execute(
        "INSERT INTO tags (name, userId) VALUES (?, ?)",
        [t.name, USER_ID]
      );
    }
    console.log(`   ✅ ${tags.length} 个`);

    // Words (分批)
    console.log(`\n📖 Words (${words.length})...`);
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      await conn.execute(
        "INSERT INTO words (word, phonetic, definition, example, notes, proficiency, learningStatus, userId, groupId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [w.word, w.phonetic || "", w.definition || "", w.example || "", w.notes || "", "new", "idle", USER_ID, null]
      );
      if ((i + 1) % 20 === 0) process.stdout.write(`   ${i + 1}/${words.length}\r`);
    }
    console.log(`   ✅ ${words.length} 个`);

    console.log("\n🎉 导入完成！刷新 Railway 地址查看数据。");
  } catch (err) {
    console.error("\n❌ 错误:", err.message);
  } finally {
    await conn.end();
  }
}

main();
