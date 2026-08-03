# Phase 3 — Capacitor / 商店上架（手动步骤）

> 本文件记录需要在你**本机开发环境**执行的步骤：
> - iOS 上架需要 Mac + Xcode 15+ + iOS 26 SDK
> - Windows MSIX 打包需要 Windows 11 + Visual Studio 2022 + Windows SDK + .NET 8
>
> 在容器化 / VPS 上无法完成这两步。Phase 1–2（VPS 部署 + 设备配对认证）已经在仓库里跑通了。

## 一、一次性准备

### 1. 推送仓库到 Git

```powershell
cd C:\Users\15008\projects\personal-growth-desk
git init  # 首次
git add .
git commit -m "feat: cross-platform scaffold"
git remote add origin <你的 git 仓库 URL>
git push -u origin main
```

### 2. VPS 上拉取 + 启动

VPS 上：

```bash
git clone <你的 git 仓库 URL> personal-growth-desk
cd personal-growth-desk
cp .env.example .env
# 编辑 .env：填写 DOMAIN（你的域名） 和 ALLOWED_ORIGINS=https://你的域名
docker compose -f docker/docker-compose.yml up -d --build
```

第一次访问 `https://你的域名/` 会：
1. 跳到 `/settings/setup`
2. 点 "创建主设备"
3. 拿到 master token（只显示一次！复制到密码管理器）

---

## 二、Windows MSIX 上架（在你 Windows 开发机上）

### 前置

| 组件 | 来源 |
|---|---|
| Visual Studio 2022（Community 即可） | https://visualstudio.microsoft.com/ |
| 工作负载：.NET 桌面开发 + 通用 Windows 平台开发 | VS 安装器里勾选 |
| Windows SDK（最新） | VS 安装器里勾选 |
| .NET 8 | https://dotnet.microsoft.com/download/dotnet/8.0 |

### 步骤

```powershell
cd C:\Users\15008\projects\personal-growth-desk

# 1. 安装 Windows 平台支持（只需一次）
pnpm dlx cap add windows

# 2. 同步 web build 到 windows/app/
pnpm build
pnpm dlx cap sync windows

# 3. 在 VS 2022 中打开 windows/ 项目
#    - 配置 Package.appxmanifest（应用名、图标、权限）
#    - 选择 Release + x64（ARM64 可选）
#    - 项目 → 发布 → 创建应用包 → 旁加载（sideload）或 Microsoft Store

# 4. Microsoft Store 上架：
#    - 注册 Partner Center 账号（一次性 $19）
#    - 在 Partner Center 创建新应用，保留包标识符
#    - 上传 .msix 或 .appxupload
#    - 填写商店资料（截屏、描述、隐私 URL）
#    - 提交审核
```

### 应用包标识符必须一致

`capacitor.config.ts` 里的 `appId: "com.personal.growthdesk"` 必须与
`Package.appxmanifest` 的 `<Identity Name="...">` 一致，否则 sideload
会失败。如果改名（首次上架后**不能改**），需要在 Partner Center
保留新名称。

---

## 三、iOS App Store 上架（在你的 Mac 上）

### 前置

| 组件 | 来源 |
|---|---|
| Xcode 15+（必须支持 iOS 26 SDK） | App Store |
| CocoaPods | `sudo gem install cocoapods` |
| Apple Developer 账号（$99/年） | https://developer.apple.com/ |

### 步骤

```bash
cd personal-growth-desk

# 1. 安装 iOS 平台（只需一次）
pnpm dlx cap add ios

# 2. 同步 web build 到 ios/App/
pnpm build
pnpm dlx cap sync ios

# 3. 在 Xcode 中打开 ios/App/
#    - 配置 Signing & Capabilities（Apple Developer Team）
#    - 配置 Info.plist（应用显示名、图标、相机/相册权限说明等）
#    - 关联 App Group（widget 阶段需要）

# 4. App Store Connect：
#    - 创建 App，Bundle ID = com.personal.growthdesk
#    - 上传构建（Xcode → Product → Archive → Distribute App）
#    - 填写商店资料
#    - 提交审核

# 5. 审核常见被拒原因：
#    - 应用崩溃（先 TestFlight 跑几轮）
#    - 截图与实际界面不符
#    - 没有"忘记密码 / 账号恢复"路径
#    - 我们是 token + 配对流程，没有密码路径——README 必须写明
```

---

## 四、Capacitor 关键配置说明

我们用 **remote mode**：Capacitor WebView 直接加载 VPS URL，不打包 web
代码进二进制。优点：web 端更新立即生效，不用每次发版都重新提包。
缺点：断网时应用空白（V2 加离线队列）。

切换到 **bundle mode**（完全离线可用）需要：
1. `next.config.ts` 加 `output: "export"`（仅静态导出）
2. 删掉所有 server actions，改为客户端 fetch
3. Capacitor 里改 `server.url: ""`

不建议在 MVP 阶段切。

---

## 五、原生插件（按需启用）

仓库已安装：
- `@capacitor/app`
- `@capacitor/device`
- `@capacitor/filesystem`

未安装（等你确认是否要）：
- `@capacitor-community/biometric`（Face ID / Windows Hello）
- `@capacitor/push-notifications`（推送）
- `@capacitor/haptics`（触感反馈）

安装命令：
```powershell
pnpm add @capacitor-community/biometric
pnpm dlx cap sync ios windows
```

---

## 六、Phase 4+ 的服务（推送、Widget）

这些阶段的代码需要在：
- `lib/push/` 服务端 FCM 调用
- `lib/push/scheduler.ts` 定时扫描提醒
- `native/widgets/*.swift` iOS WidgetKit（仅 Mac）
- `windows/appxmanifest.xml` Tile 配置

不在当前 plan 实现范围。代码位置已经在 README + plan 里预留。

---

## 七、回到开发

日常开发时（修改了 web 代码）：

```powershell
pnpm dev
# iOS Simulator
pnpm dlx cap run ios
# Windows 本机
pnpm dlx cap run windows
```

修改了 Capacitor 配置（capacitor.config.ts）后：

```powershell
pnpm dlx cap sync ios windows
```