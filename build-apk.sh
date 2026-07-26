#!/bin/bash
# 词音岛 APK 打包脚本
# 使用方法：
# 1. 确保已安装 Node.js 16+ 和 Java 17+
# 2. chmod +x build-apk.sh
# 3. ./build-apk.sh https://your-domain.com

set -e

URL="${1:-https://myapp-hono2.pages.dev}"
MANIFEST="${URL}/manifest.webmanifest"
BUILD_DIR="./apk-output"

echo "=========================================="
echo "  词音岛 APK Builder"
echo "  Source: ${URL}"
echo "=========================================="

# 检查依赖
command -v node >/dev/null 2>&1 || { echo "需要 Node.js，请安装 https://nodejs.org/"; exit 1; }
command -v java >/dev/null 2>&1 || { echo "需要 Java 17，请安装"; exit 1; }

# 安装 Bubblewrap（如果未安装）
if ! command -v bubblewrap >/dev/null 2>&1; then
    echo "[1/4] 安装 Bubblewrap..."
    npm install -g @bubblewrap/cli
fi

# 创建构建目录
rm -rf ${BUILD_DIR}
mkdir -p ${BUILD_DIR}

# 初始化项目
echo "[2/4] 初始化 TWA 项目..."
cd ${BUILD_DIR}

# 使用 expect 自动回答交互式问题
if command -v expect >/dev/null 2>&1; then
    expect -c "
        spawn bubblewrap init --manifest ${MANIFEST}
        expect \"install the JDK\"
        send \"n\r\"
        expect \"existing JDK\"
        send \"\r\"
        expect \"install Android SDK\"
        send \"n\r\"
        expect \"existing Android SDK\"
        send \"\r\"
        expect eof
    "
else
    echo "请手动运行以下命令并按提示操作："
    echo "  bubblewrap init --manifest ${MANIFEST}"
    echo ""
    echo "推荐回答："
    echo "  - 安装 JDK? → No（使用系统 JDK）"
    echo "  - JDK 路径 → 回车自动检测"
    echo "  - 安装 Android SDK? → No"
    echo "  - SDK 路径 → 回车"
    exit 1
fi

# 构建 APK
echo "[3/4] 构建 APK..."
bubblewrap build

# 输出结果
echo ""
echo "=========================================="
echo "  APK 构建完成！"
echo "=========================================="
echo ""
echo "文件位置："
ls -la ./*.apk 2>/dev/null || echo "  app-release-signed.apk"
echo ""
echo "安装到平板："
echo "  adb install app-release-signed.apk"
echo ""
echo "或者通过 USB/微信传输到平板后点击安装"
