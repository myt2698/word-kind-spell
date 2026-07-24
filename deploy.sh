#!/bin/bash
# WordMind 一键部署脚本（Fly.io）
# 使用方法：
#   1. 在 https://fly.io 注册账号（可用 GitHub 登录）
#   2. 安装 flyctl: https://fly.io/docs/flyctl/install/
#   3. 运行: ./deploy.sh

set -e

echo "=== WordMind 全栈部署 ==="
echo ""

# 检查 flyctl
if ! command -v flyctl &> /dev/null; then
    echo "正在安装 flyctl..."
    case "$(uname -s)" in
        Linux*)     curl -L https://fly.io/install.sh | sh
                    export PATH="$HOME/.fly/bin:$PATH" ;;
        Darwin*)    brew install flyctl 2>/dev/null || curl -L https://fly.io/install.sh | sh ;;
        CYGWIN*|MINGW*|MSYS*)
                    echo "请手动安装 flyctl: https://fly.io/docs/flyctl/install/"
                    exit 1 ;;
        *)          echo "不支持的操作系统"; exit 1 ;;
    esac
fi

echo "✓ flyctl 已就绪"
echo ""

# 登录（浏览器弹窗授权）
echo "=== 登录 Fly.io ==="
flyctl auth login
echo "✓ 登录成功"
echo ""

# 创建应用（如果还没创建）
APP_NAME="wordmind-$(head -c 6 /dev/urandom | xxd -p 2>/dev/null || echo $$)"
echo "=== 创建应用: $APP_NAME ==="
flyctl apps create "$APP_NAME" --org personal 2>/dev/null || echo "应用已存在，继续使用"
echo ""

# 设置环境变量
echo "=== 配置环境变量 ==="
if [ -f .env ]; then
    while IFS='=' read -r key value; do
        # 跳过空行和注释
        [ -z "$key" ] && continue
        [[ "$key" =~ ^# ]] && continue
        # 去除前后空格
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs)
        [ -n "$key" ] && [ -n "$value" ] && flyctl secrets set "$key=$value" --app "$APP_NAME" 2>/dev/null || true
    done < .env
    echo "✓ 环境变量已设置"
else
    echo "⚠️  未找到 .env 文件，请手动设置环境变量"
    echo "   flyctl secrets set DATABASE_URL=xxx --app $APP_NAME"
fi
echo ""

# 部署
echo "=== 开始部署（首次可能需要 2-3 分钟）==="
flyctl deploy --app "$APP_NAME" --ha=false
echo ""

# 显示访问地址
echo "=== 部署完成 ==="
echo ""
echo "访问地址: https://$APP_NAME.fly.dev"
echo ""
echo "后续更新只需运行:"
echo "  flyctl deploy --app $APP_NAME"
echo ""
echo "查看日志:"
echo "  flyctl logs --app $APP_NAME"
