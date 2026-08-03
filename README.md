# 个人成长台

一个安静的个人成长台：习惯追踪 + 日记。单用户、本地自托管、禅意风格。

> MVP 范围仅包含**习惯**与**日记**两个模块。目标管理、任务、阅读、AI 等延后实现。

## 技术栈

- Next.js 15（App Router）+ React 19 + TypeScript
- Tailwind CSS + shadcn/ui（New York / Neutral，深色默认）
- Drizzle ORM + better-sqlite3（本地 SQLite，`./data/app.db`）
- TipTap（自定义 `[[wiki-link]]` 与 `#tag` 扩展）
- react-calendar-heatmap（习惯历史热力图）
- TanStack Query（读取）+ Server Actions（写入）
- Vitest（单元测试）

## 开发

```powershell
pnpm install
pnpm db:generate        # 生成迁移 SQL
pnpm db:migrate         # 应用迁移
pnpm dev                # 启动 http://localhost:3000
```

首次启动会自动创建 `./data/app.db`。

### 常用脚本

| 命令 | 作用 |
|---|---|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 生产构建 |
| `pnpm start` | 启动生产服务 |
| `pnpm test` | 跑单元测试 |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | 生成 Drizzle 迁移 |
| `pnpm db:migrate` | 应用 Drizzle 迁移 |
| `pnpm db:studio` | 打开 Drizzle Studio |

## 功能

### 习惯（Habit）
- 三种频率：**每日 / 每周（多选星期）/ 每 N 天**
- 数值型目标（如"喝 8 杯水"）+ 单位
- 打卡（含备注）、取消签到、暂停 / 恢复 / 归档
- 当前连续 & 历史最长
- 近一年热力图（键盘可达 + 文字记录列表双通道）
- 颜色、提醒时间（仅存储，不调度系统通知）

### 日记（Journal）
- 每日可写多篇
- TipTap 富文本（加粗 / 斜体 / 代码 / 二级标题 / 列表 / 引用）
- 自定义扩展：
  - `[[wiki-link]]` 引用其他日记（未解析为虚线下划线）
  - `#tag` 内联标签（自动标准化）
- 心情打分：1–5 中文标签（低落 / 偏低 / 平静 / 愉快 / 很好）
- 时间流、标签 / 关键字筛选、反向链接面板

## 目录结构

```
app/                # Next App Router
  api/              # REST endpoints
  habits/           # 习惯页面
  journal/          # 日记页面
  manifest.ts       # PWA 清单
components/
  habits/           # 习惯 UI
  journal/          # 日记 UI + 编辑器 + 扩展
  layout/           # AppShell / PrimaryNav / ThemeToggle
  shared/           # QueryProvider / Toaster / OfflineNotice / EmptyState
  ui/               # shadcn 基础组件
db/
  schema/           # Drizzle schema（6 张表）
  migrations/       # 迁移 SQL
lib/
  services/         # habit / streak / journal / completion / parser
  actions/          # Next.js Server Actions
  validation/       # Zod 输入校验
  queries/          # TanStack Query hooks
  dates.ts          # DateKey（YYYYMMDD）工具
tests/              # Vitest
```

## 数据模型概览

- `habits` — 习惯定义（含频率 discriminant union）
- `habit_completions` — 一次一行打卡，`UNIQUE(habit_id, completed_on)`
- `habit_streaks` — 每习惯一行计数器
- `journal_entries` — 日记，`content` 为 TipTap JSON 字符串
- `journal_tags` — 物化标签
- `journal_links` — 物化 wiki-link

## 设计原则

- **静默优先**：默认深色、低饱和度蓝灰，无积分 / 徽章 / 庆祝动画
- **数据自托管**：单 SQLite 文件，便于备份 / 迁移
- **服务端权威**：Tag / link 在服务端重新解析并物化；JSON 是正文唯一来源
- **无认证**（MVP）：单用户本地部署
- **可演进**：模块化路由，后续加目标 / 任务 / 阅读不会破坏现有数据

## 不在 MVP 范围

- 目标 / OKR、任务 / Todo、阅读清单
- 心情趋势 / streak 曲线图
- 多用户、认证、注册
- 云同步、跨设备、离线 mutation queue
- AI 写作 / 总结 / embedding
- 原生 iOS / Android / Windows 应用
- 端到端加密（E2EE）
- 系统级提醒调度
- 数据导入 / 导出 UI

## 已知风险

- **better-sqlite3 原生模块**：Windows 上需要 Visual Studio Build Tools 与 LTS Node
- **HMR 多连接**：`db/client.ts` 用 `globalThis` 单例避免 WAL 锁
- **SQLite 单写者**：签到用短事务，已设 `busy_timeout`
- **Serwist PWA**：与 TipTap 在 webpack 下有冲突，MVP 暂未启用 service worker；manifest 已就绪，可"添加到主屏幕"，但离线 shell 暂未提供

## 测试

```powershell
pnpm test
```

覆盖：
- 日期 / DateKey 边界（闰年、月末、周一）
- Streak gaps-and-islands 算法（每日 / 每周 / 间隔）
- habit Zod 校验（频率、颜色、提醒时间、标签）
- journal Zod 校验（mood 一致性、分数范围）
- 日记 parser（tag 去重、wiki-link、安全 HTML 转义）

## License

MIT