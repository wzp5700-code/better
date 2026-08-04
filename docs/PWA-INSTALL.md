# PWA 安装指南

> 不用 Apple Developer 账号、**不用 Mac 电脑**。iPhone 用 Safari 把网站加到主屏，体验 ≈ 原生 App。

---

## iPhone / iPad（iOS Safari）

### 1. 用 Safari 打开
```
https://你的域名/
```
或当前 IP：
```
http://119.23.72.86/
```

### 2. 点底部中间的「分享」按钮
- 是个**带向上箭头的方框**图标
- 在 Safari 底部工具栏

### 3. 选「添加到主屏幕」
- 滑动找到
- 名字默认「个人成长台」，可以改

### 4. 点右上角「添加」
- 主屏出现「个人成长台」图标
- 点开 → **全屏运行**（无 Safari 地址栏）
- 跟原生 App 几乎一样

### 5. 桌面图标长什么样
- 圆角深灰底 + 中间白色钟表指针 + 底部「成长」字样
- 180×180 / 192×192 多尺寸适配

---

## Android（Chrome）

### 1. 用 Chrome 打开
```
https://你的域名/
```

### 2. 右上角三点菜单 → 「添加到主屏幕」/「安装应用」
- 一次性弹窗
- 名字确认 → 点「安装」

或等浏览器**自动弹出底部提示**（"Add to Home Screen" 横幅）。

### 3. 桌面出现「个人成长台」图标
- Chrome 也支持 PWA 安装到桌面
- 全屏运行，可离线启动

---

## 桌面（Chrome / Edge）

### 1. Chrome / Edge 打开
```
https://你的域名/
```

### 2. 地址栏右侧「安装」图标
- 出现 ⊕ 图标
- 点 → 弹窗 → 选「安装」

### 3. 桌面 / 开始菜单出现 PWA 快捷方式
- 独立窗口运行（无浏览器地址栏）
- 看起来像原生应用

---

## 已知限制

| 功能 | 状态 | 说明 |
|---|---|---|
| 启动屏 | ✅ 有 | iOS 用 icon-180.png（启动时显示） |
| 主题色 | ✅ 有 | 状态栏 / 地址栏背景跟随 |
| 全屏体验 | ✅ 有 | standalone display mode |
| 离线启动 | ⚠️ 需 service worker | 暂未启用（Next.js + Serwist 编译问题），刷新页可用，离线启动不行 |
| 推送通知 iOS | ⚠️ iOS 16.4+ 仅 Add to Home Screen 后可用 | 需要额外 FCM 配置 |
| 后台同步 | ❌ | PWA 标准 sync API，需要 service worker |
| 文件系统访问 | ⚠️ iOS Safari 受限 | 用 @capacitor/filesystem 时绕过 |
| 摄像头/麦克风 | ✅ | 浏览器 API |

---

## 调试小贴士

### iOS Safari 看 PWA 状态
1. 打开 PWA 站点
2. 在 Safari 地址栏输入：
   ```
   javascript:alert(JSON.stringify({standalone: navigator.standalone, displayMode: matchMedia('(display-mode: standalone)').matches}))
   ```
3. （现代 iOS Safari 不支持 javascript: URL，但装到主屏后**完全屏模式**就说明成了）

### 检查 PWA 清单
浏览器开 `https://你的域名/manifest.webmanifest` → 应该返回 JSON。

### Chrome DevTools 看 PWA
- F12 → **Application** 标签 → **Manifest** 块
- 看到「Installability: ✓」就是可以装
- **Service Workers** 块看是否注册

---

## 卸载

- **iOS**：长按主屏图标 → 选「移除 App」→ 确认
- **Android**：长按图标 → 卸载
- **桌面 Chrome**：三点菜单 → 「卸载 [应用名]」

---

## 升级 PWA 版本

普通 PWA 升级 = 重新部署新版本。下次用户打开会自动更新。

iOS Safari 行为：
- 自动 fetch 清单文件变化
- 检测到更新会提示用户刷新
- 用户接受后重新加载即可
