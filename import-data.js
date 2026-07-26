#!/usr/bin/env node
/**
 * 词音岛数据迁移脚本
 * 把旧站导出的数据导入到新站 Railway 数据库
 * 
 * 使用方法：
 * 1. 先把 wordmind-backup.json 放到项目根目录
 * 2. 设置数据库地址: export DATABASE_URL="mysql://..."
 * 3. 运行: node import-data.js
 */

import fs from "fs";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ 请设置 DATABASE_URL 环境变量");
  console.error("   export DATABASE_URL=mysql://root:密码@域名:端口/railway");
  process.exit(1);
}

const backupFile = process.argv[2] || "./wordmind-backup.json";
if (!fs.existsSync(backupFile)) {
  console.error(`❌ 找不到备份文件: ${backupFile}`);
  console.error("   请把 wordmind-backup.json 放到当前目录");
  process.exit(1);
}

async function main() {
  console.log("📦 词音岛数据迁移工具\n");

  // 读取备份数据
  const backup = JSON.parse(fs.readFileSync(backupFile, "utf-8"));
  const words = JSON.parse(backup.words).result.data.json;
  const groups = JSON.parse(backup.groups).result.data.json;
  const tags = JSON.parse(backup.tags).result.data.json;

  console.log(`📊 备份数据:`);
  console.log(`   单词: ${words.length}`);
  console.log(`   课本/单元: ${groups.length}`);
  console.log(`   标签: ${tags.length}\n`);

  // 连接数据库
  const conn = await mysql.createConnection(DATABASE_URL);
  console.log("✅ 数据库连接成功\n");

  try {
    // 1. 检查是否已有用户
    const [users] = await conn.execute("SELECT id, name FROM users LIMIT 1");
    let userId;

    if (users.length > 0) {
      userId = users[0].id;
      console.log(`👤 使用已有用户: ${users[0].name} (ID: ${userId})`);
      console.log("   如需指定其他用户，修改脚本中 userId 的值\n");
    } else {
      // 需要先在新站注册一个账号
      console.error("❌ 新站还没有用户！");
      console.error("   请先访问 https://wordmind-production.up.railway.app");
      console.error("   注册一个账号，然后再运行此脚本。\n");
      process.exit(1);
    }

    // 2. 导入 Groups（课本/单元）
    console.log("📚 导入 Groups...");
    const groupIdMap = {}; // 旧ID -> 新ID
    for (const g of groups) {
      const [result] = await conn.execute(
        "INSERT INTO word_groups (name, description, sort_order, user_id, textbook_id) VALUES (?, ?, ?, ?, ?)",
        [g.name, g.description || "", g.sortOrder || 0, userId, null]
      );
      groupIdMap[g.id] = result.insertId;
    }
    console.log(`   ✅ 导入 ${groups.length} 个 Groups`);

    // 3. 导入 Tags
    console.log("\n🏷️ 导入 Tags...");
    const tagIdMap = {};
    for (const t of tags) {
      const [result] = await conn.execute(
        "INSERT INTO tags (name, user_id) VALUES (?, ?)",
        [t.name, userId]
      );
      tagIdMap[t.id] = result.insertId;
    }
    console.log(`   ✅ 导入 ${tags.length} 个 Tags`);

    // 4. 导入 Words
    console.log("\n📖 导入 Words...");
    let count = 0;
    for (const w of words) {
      const newGroupId = groupIdMap[w.groupId] || null;
      
      await conn.execute(
        "INSERT INTO words (word, phonetic, definition, example, notes, proficiency, learning_status, user_id, group_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          w.word,
          w.phonetic || "",
          w.definition || "",
          w.example || "",
          w.notes || "",
          "new",      // proficiency
          "idle",     // learningStatus
          userId,
          newGroupId
        ]
      );
      count++;
      if (count % 50 === 0) {
        process.stdout.write(`   进度: ${count}/${words.length}\r`);
      }
    }
    console.log(`   ✅ 导入 ${count} 个 Words`);

    console.log("\n🎉 数据迁移完成！");
    console.log(`   访问 https://wordmind-production.up.railway.app 查看数据`);

  } catch (err) {
    console.error("\n❌ 导入失败:", err.message);
    console.error(err.stack);
  } finally {
    await conn.end();
  }
}

main();
