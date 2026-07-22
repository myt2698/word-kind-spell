# WordMind APK 打包指南

## 方案一：PWA Builder（推荐，最简单）

PWA Builder 是微软提供的免费在线工具，可以把 PWA 网站直接打包成 APK。

### 步骤：

1. **访问** https://www.pwabuilder.com/

2. **输入你的应用网址**（部署后的域名），例如：
   ```
   https://myapp-hono2.pages.dev/
   ```

3. **点击"Start"**

4. 等待 PWA Builder 分析你的网站

5. 在 Package 部分选择 **Android**

6. 下载 APK 文件

7. 将 APK 传到华为平板上安装

---

## 方案二：Bubblewrap（命令行，更专业）

Bubblewrap 是 Google 官方推荐的 TWA（Trusted Web Activity）打包工具。

### 前置要求

- Node.js 16+
- Java JDK 17+
- Android SDK（可选，如果不签名的话）

### 步骤：

1. **安装 Bubblewrap**
   ```bash
   npm install -g @bubblewrap/cli
   ```

2. **初始化项目**
   ```bash
   mkdir wordmind-apk && cd wordmind-apk
   bubblewrap init --manifest https://myapp-hono2.pages.dev/manifest.webmanifest
   ```
   按提示填写信息，一路回车使用默认值即可。

3. **构建 APK**
   ```bash
   bubblewrap build
   ```
   生成的 APK 在 `app-release-signed.apk`

4. **传到平板安装**

---

## 方案三：Android Studio（最灵活）

如果你需要深度定制原生功能，可以用 Android Studio 创建一个 TWA 项目。

### 步骤：

1. **安装 Android Studio**

2. **创建新空项目**
   - 选择 "Empty Activity"
   - 包名：`com.wordmind.app`
   - 语言：Kotlin
   - 最低 SDK：API 21 (Android 5.0)

3. **添加 TWA 依赖**
   在 `build.gradle` (app module) 中添加：
   ```gradle
   dependencies {
       implementation 'com.google.androidbrowserhelper:androidbrowserhelper:2.5.0'
   }
   ```

4. **创建 TWA Activity**
   在 `AndroidManifest.xml` 中添加：
   ```xml
   <activity android:name="com.google.androidbrowserhelper.trusted.LauncherActivity"
       android:exported="true">
       <intent-filter>
           <action android:name="android.intent.action.MAIN" />
           <category android:name="android.intent.category.LAUNCHER" />
       </intent-filter>
       <meta-data android:name="asset_statements" android:resource="@string/asset_statements" />
   </activity>
   ```

5. **配置字符串**
   在 `res/values/strings.xml` 中添加：
   ```xml
   <string name="asset_statements">
   [{
       "relation": ["delegate_permission/common.handle_all_urls"],
       "target": {
           "namespace": "web",
           "site": "https://myapp-hono2.pages.dev"
       }
   }]
   </string>
   <string name="app_name">WordMind</string>
   <string name="short_name">WordMind</string>
   <string name="launchUrl">https://myapp-hono2.pages.dev/</string>
   ```

6. **构建签名 APK**
   - Build > Generate Signed Bundle/APK

---

## 华为平板安装 APK

1. **开启"允许安装未知来源应用"**
   - 设置 → 安全 → 更多安全设置 → 安装外部来源应用 → 选择你的文件管理器 → 允许

2. **传输 APK 到平板**
   - 通过微信文件传输助手
   - 或用 USB 数据线连接电脑传输

3. **点击 APK 文件安装**

4. **打开应用**
   - 桌面上会出现 WordMind 图标
   - 首次打开需要联网加载

---

## 常见问题

### Q: 安装后打开是白屏？
A: 确保网址可以正常访问，且 HTTPS 证书有效。

### Q: 能否离线使用？
A: TWA 本质还是 Web 应用，首次需要联网。但 PWA 缓存后断网也能用。

### Q: 能否在应用商店上架？
A: 可以！TWA 完全符合 Google Play 的上架要求。

### Q: 和原生 App 有什么区别？
A: TWA 是把网页包装成 App，功能完全一样的，但体积非常小（几百KB）。
