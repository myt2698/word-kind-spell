# 词音岛

词音岛是一套面向英语单词学习的全栈应用，支持教材词库、分组与标签管理、自然拼读、听写和拼写训练、错题记录、学习统计、PWA 安装以及 Android/iOS 打包。

## 技术架构

- Web：React 19、TypeScript、Vite、Tailwind CSS、Radix UI
- API：Hono、tRPC
- 数据：MySQL、Drizzle ORM
- 客户端：PWA、Capacitor Android/iOS
- 鉴权：昵称和密码登录，可选 Kimi OAuth

生产环境由同一个 Node.js 进程提供前端静态文件和 `/api` 接口，不能只部署 `dist/public`。

## 本地开发

要求 Node.js 20+、npm 10+ 和 MySQL 8+。

```bash
npm ci
cp .env.example .env
npm run db:migrate
npm run dev
```

Windows PowerShell 可使用：

```powershell
Copy-Item .env.example .env
npm run db:migrate
npm run dev
```

开发地址默认为 <http://localhost:3000>。

最小环境变量：

```dotenv
APP_ID=word-kind-spell
APP_SECRET=请使用至少32字节的随机字符串
DATABASE_URL=mysql://user:password@127.0.0.1:3306/word_kind_spell
```

仅使用昵称密码登录时，Kimi OAuth 变量可以留空；启用 Kimi 登录时再配置 `VITE_KIMI_AUTH_URL`、`VITE_APP_ID`、`KIMI_AUTH_URL` 和 `KIMI_OPEN_URL`。

## 常用命令

```bash
npm run check       # TypeScript
npm test            # 单元测试
npm run lint        # ESLint
npm run build       # 前端与服务端生产构建
npm run db:generate # 生成迁移
npm run db:migrate  # 执行迁移
npm run db:seed     # 验证数据库连接
```

## 目录

```text
src/        React 前端
api/        Hono/tRPC 服务端
contracts/  前后端共享类型和常量
db/         Drizzle 模型与迁移
android/    Capacitor Android 工程
ios/        Capacitor iOS 工程
scripts/    词库维护脚本
```

完整生产部署说明见 [DEPLOY.md](DEPLOY.md)，移动端说明见 [APK打包指南.md](APK打包指南.md)。

## 上线检查

- 使用独立、随机的 `APP_SECRET`
- 通过 HTTPS 提供服务
- 先运行数据库迁移
- 将限流部署在单实例服务或外部网关后；多实例环境建议由反向代理或 Redis 统一限流
- 备份 MySQL 与对象存储中的音频
