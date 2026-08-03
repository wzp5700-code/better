# 个人成长台 — 系统架构

## 概览

单用户 + 多设备、本地自托管的"习惯 + 日记"应用。

- **后端**：Next.js 15（App Router）+ Drizzle + better-sqlite3，单一 SQLite 文件
- **前端**：React 19 + Tailwind + shadcn/ui，禅意深色主题
- **认证**：首设备 token + 二维码配对，无密码 / 无邮箱
- **跨平台**：Capacitor 8.x 包装 iOS + Windows；PWA manifest 用于浏览器安装
- **推送**：FCM HTTP v1（Phase 4，env 缺失时静默跳过）
- **部署**：Docker + Caddy + Let's Encrypt 自动 HTTPS

## 路由（26）

| 路由 | 说明 | 静态/动态 |
|---|---|---|
| `/` | 今日 | 静态 |
| `/habits` | 习惯列表 | 静态 |
| `/habits/[id]` | 习惯详情 + 热力图 | 动态 |
| `/journal` | 日记时间流 | 动态 |
| `/journal/new` | 新建日记 | 静态 |
| `/journal/[id]` | 日记详情 / 编辑 | 动态 |
| `/categories` | 分类管理 | 静态 |
| `/calendar` | 日历（月视图） | 静态 |
| `/settings/setup` | 首设备初始化 | 静态 |
| `/settings/devices` | 设备管理 + 配对码 | 静态 |
| API 16 个 | 见下 | 动态 |

## API 路由

| 路径 | 方法 | 鉴权 |
|---|---|---|
| `/api/health` | GET | 公开 |
| `/api/setup` | POST | 公开（仅一次） |
| `/api/pair` | POST | 公开（凭短码） |
| `/api/pairing-code` | POST | 需要 master |
| `/api/devices` | GET / DELETE | 需要 Bearer |
| `/api/habits` | GET / POST | 需要 Bearer |
| `/api/habits/[id]` | GET / PATCH / DELETE | 需要 Bearer |
| `/api/habits/[id]/completions` | POST / PUT / GET | 需要 Bearer |
| `/api/journal` | GET / POST | 需要 Bearer |
| `/api/journal/[id]` | GET / PATCH / DELETE | 需要 Bearer |
| `/api/journal/wiki-targets` | GET | 需要 Bearer |
| `/api/journal/categories` | GET / POST | 需要 Bearer |
| `/api/journal/categories/[id]` | GET / PATCH / DELETE | 需要 Bearer |
| `/api/journal/entries/[id]/category` | PUT | 需要 Bearer |
| `/api/calendar/[date]` | GET | 需要 Bearer |
| `/api/calendar/month/[year]/[month]` | GET | 需要 Bearer |
| `/api/push/register` | POST / DELETE | 需要 Bearer |

## 数据模型（10 表）

```
habits ──┬── habit_completions (UNIQUE(habit_id, completed_on))
         ├── habit_streaks (1:1)
         └── push_delivery_log (idempotency for reminders)

journal_entries ──┬── journal_tags (UNIQUE(entry_id, tag))
                   ├── journal_links ─── self-ref via to_entry_id
                   └── journal_categories (FK category_id SET NULL)

devices ──┬── pairing_codes (created_by_device_id / used_by_device_id)
          └── push_tokens (UNIQUE token)

auth flow:
   POST /api/setup (no auth) → creates devices row with master=true, returns token
   POST /api/pairing-code (master only) → short-lived pairing_codes row
   POST /api/pair (with code) → creates non-master devices row
   middleware.ts: SHA-256(token) → SELECT devices WHERE token_hash = ?
```

## 模块边界

- `app/` — Next App Router 路由
- `components/` — React UI
  - `habits/`、`journal/`、`layout/`、`shared/`、`ui/`（shadcn）
- `db/schema/` — Drizzle 表定义
- `db/client.ts` — better-sqlite3 单例（globalThis.HMR 缓存）
- `lib/services/` — 业务逻辑（habit / streak / journal / completion / category / parser）
- `lib/actions/` — Next.js Server Actions
- `lib/queries/` — TanStack Query hooks（客户端 fetcher）
- `lib/auth/` — token 生成 / 配对 / Bearer 中间件
- `lib/push/` — FCM 客户端 + 提醒调度器
- `lib/client/` — 客户端 token 存储 + apiFetch
- `lib/validation/` — Zod 输入校验
- `lib/dates.ts` — DateKey（YYYYMMDD）工具
- `tests/` — Vitest（71 测试）

## 中间件执行顺序

```
Request
  ↓
middleware.ts (Node.js runtime, only /api/*)
  ↓ 解析 Bearer → SHA-256 → 查 devices → 设置 x-device-* 头
  ↓
Route handler (app/api/.../route.ts)
  ↓ 读 x-device-* → getDeviceContext() 校验 master / 写操作
  ↓
lib/services/*.ts → Drizzle → better-sqlite3 → ./data/app.db
```

## 部署拓扑

```
                ┌─────────────────────────────┐
   iPhone ─────┤                             │
                │   Capacitor WebView (WKWebView) │
   Browser ────┤   https://your.domain.com   │
                │                             │
   Windows ────┤                             │
                └──────────────┬──────────────┘
                               │ HTTPS (Caddy)
                               ▼
                  ┌────────────────────────────┐
                  │  VPS (Docker)               │
                  │  ┌────────────┐            │
                  │  │   caddy     │ TLS cert  │
                  │  ├────────────┤            │
                  │  │    app     │ Next.js    │
                  │  │            │ (Node.js)  │
                  │  ├────────────┤            │
                  │  │   backup   │ cron       │
                  │  └────────────┘            │
                  │  /app/data/app.db (volume) │
                  │  /backups/*.db   (volume) │
                  └────────────────────────────┘
                               │
                  (scheduler 每分钟扫 habits)
                               │
                               ▼
                       FCM HTTP v1 API
                               │
                               ▼
                  APNs / FCM → iOS notification
```

## 已知设计权衡

- **单文件 SQLite**：单用户场景下简单、备份容易；并发场景不适合
- **每次请求都 hash token**：db 查询一次 vs hash 一次；hash 256-bit SHA-256 极快，可接受
- **scheduler 不重启做 fallback**：用 setInterval + unref；崩溃重启靠 `push_delivery_log` 唯一约束保证幂等
- **离线写入**：暂不支持；MVP 强制在线
- **iOS Widget**：未实现；预留 `native/` 目录
- **E2EE**：未实现；单机用户场景暂不需要

## 开发环境快速命令

```bash
pnpm dev               # 启动 dev server
pnpm test              # 跑 71 测试
pnpm build             # 生产构建
pnpm typecheck         # tsc --noEmit
pnpm db:generate       # 生成迁移
pnpm db:migrate        # 应用迁移
pnpm db:studio         # Drizzle Studio
```

## 未来 Roadmap

| Phase | 内容 | 状态 |
|---|---|---|
| 1 | VPS 自托管部署 | ✅ 完成 |
| 2 | 设备配对认证 | ✅ 完成 |
| 3 | Capacitor 包装（iOS + Windows） | ✅ 配置完成，构建需 Mac / VS |
| 4 | FCM 推送 | ✅ 完成（待用户配 Firebase） |
| 5 | iOS 主屏 Widget | ⏳ 待做 |
| 6 | Windows Pin-to-Start tile | ⏳ 待做 |
| 7 | 离线写入队列 | ⏳ 待做 |