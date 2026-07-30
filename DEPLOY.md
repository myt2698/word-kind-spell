# 词音岛全栈应用部署指南

## 架构说明

词音岛是一个全栈应用，包含：
- **前端**：React 19 + TypeScript + Vite（构建产物在 `dist/public/`）
- **后端**：Node.js + Hono + tRPC（入口 `dist/boot.js`）
- **数据库**：MySQL（通过 Drizzle ORM 连接）
- **认证**：Kimi OAuth 2.0

生产模式下，Node.js 服务器同时服务前端静态文件和 API 请求，**不能只部署前端**。

---

## 方案一：Railway 部署（推荐，最简单）

Railway 支持 Docker 部署，且自带 MySQL 插件。

### 步骤

1. **Fork/上传代码到 GitHub**
   ```bash
   git push origin main
   ```

2. **在 Railway 创建项目**
   - 访问 https://railway.app
   - 点击 "New Project" → "Deploy from GitHub repo"
   - 选择你的词音岛仓库
   - Railway 会自动识别 `railway.toml` 和 `Dockerfile`

3. **添加 MySQL 数据库**
   - 在项目页面点击 "New" → "Database" → "Add MySQL"
   - 创建后会自动生成 `DATABASE_URL` 环境变量

4. **配置环境变量**
   在 Railway 项目 Settings → Variables 中添加：
   ```
   APP_ID=你的_APP_ID
   APP_SECRET=你的_APP_SECRET
   VITE_APP_ID=你的_APP_ID
   OWNER_UNION_ID=你的_UNION_ID
   YOUDAO_APP_KEY=你的有道KEY
   YOUDAO_APP_SECRET=你的有道SECRET
   ```
   `DATABASE_URL` 由 Railway MySQL 插件自动生成。

5. **部署**
   - 每次 push 到 main 分支会自动重新部署
   - 首次部署完成后，访问分配的域名即可

---

## 方案二：Render 部署

Render 有免费 tier，支持 Docker。

### 步骤

1. **上传代码到 GitHub**

2. **在 Render 创建 Web Service**
   - 访问 https://render.com
   - "New" → "Web Service" → 连接 GitHub 仓库
   - Runtime 选择 "Docker"
   - Render 会自动读取 `render.yaml`

3. **配置环境变量**
   在 Render Dashboard → Environment 中添加所有必需的变量（参考上面的列表）。

4. **创建 MySQL 数据库**
   - Render 不提供免费的 MySQL，需要：
     - 使用 Render 的 PostgreSQL（需要修改代码适配）
     - 或使用外部 MySQL（如阿里云 RDS、PlanetScale）

5. **部署**
   - 点击 "Manual Deploy" 或等待自动部署

---

## 方案三：自有服务器部署（VPS / 云服务器）

适合已有服务器的用户。

### 步骤

1. **准备服务器**
   - 安装 Node.js 22.22+ 和 PM2
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   npm install -g pm2
   ```

2. **上传代码**
   ```bash
   git clone <你的仓库> /var/www/wordmind
   cd /var/www/wordmind
   npm ci
   npm run build
   ```

3. **配置 .env**
   确保 `.env` 文件中的 `DATABASE_URL` 指向可访问的 MySQL 实例。

4. **启动服务**
   ```bash
   pm2 start dist/boot.js --name wordmind
   pm2 startup
   pm2 save
   ```

5. **配置 Nginx 反向代理**（可选，推荐用于生产）
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

6. **配置 HTTPS**（使用 Certbot）
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

---

## 方案四：Docker 部署

任何支持 Docker 的平台都适用。

### 本地测试
```bash
docker compose up -d
```
访问 http://localhost:3000

### 生产部署
```bash
# 构建镜像
docker build -t wordmind .

# 运行容器
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name wordmind \
  --restart unless-stopped \
  wordmind
```

---

## 环境变量说明

| 变量名 | 说明 | 来源 |
|--------|------|------|
| `DATABASE_URL` | MySQL 连接字符串 | Railway 自动生成 / 自建 MySQL |
| `APP_ID` | Kimi OAuth App ID | Kimi 开放平台 |
| `APP_SECRET` | Kimi OAuth App Secret | Kimi 开放平台 |
| `VITE_APP_ID` | 前端使用的 App ID（同 APP_ID） | Kimi 开放平台 |
| `OWNER_UNION_ID` | 管理员 Union ID | Kimi 开放平台 |
| `YOUDAO_APP_KEY` | 有道智云 API Key | 有道智云 |
| `YOUDAO_APP_SECRET` | 有道智云 API Secret | 有道智云 |

---

## 首次部署后操作

1. **同步数据库表结构**
   ```bash
   npm run db:push
   ```

2. **验证 API 是否正常工作**
   访问 `https://你的域名/api/trpc/word.list` 应返回 JSON 数据而非 HTML。

3. **检查 OAuth 回调地址**
   在 Kimi 开放平台确保回调地址设置为：
   ```
   https://你的域名/api/oauth/callback
   ```

---

## 故障排查

| 问题 | 原因 | 解决 |
|------|------|------|
| `Unexpected token '<'` | 后端未运行，API 返回了 HTML | 确保 Node.js 服务已启动 |
| 数据库连接超时 | DATABASE_URL 不正确或网络不通 | 检查连接字符串，确保服务器能访问 MySQL |
| 登录后跳转失败 | OAuth 回调地址配置错误 | 在 Kimi 开放平台更新回调地址 |
| 静态资源 404 | 前端构建不完整 | 重新运行 `npm run build` |
