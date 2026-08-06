# 个人成长台

Next.js 15 单用户习惯+日记，VPS 自托管 + Electron 桌面 + PWA 三端。
代码: `C:\Users\15008\projects\personal-growth-desk`
远程: `github.com/wzp5700-code/better` (私有)
VPS: `119.23.72.86` (manual docker run)

## 当前阶段 (2026-08-06)
打磨日历编辑体验:
- 打卡/日记时间归属规则 (≤ 凌晨 2 点算前一天)
- 日历界面可修改历史打卡项

## 约定
- 中文沟通，禅意极简风
- **先调研后动手**: 现状汇报 → 方案 → 审批 → 实施
- 业务规则沉淀到 `lib/dates.ts` 注释 + MEMORY.md
- schema 改动必须配 migration

## 部署 (manual docker run, 唯一权威流程)
1. 本地 `git commit` + `git push` (需 127.0.0.1:7890 在线)
2. VPS: `cd ~/personal-growth-desk && git pull`
3. `docker build -f docker/Dockerfile -t docker-app .`
4. `docker rm -f app-3000 && docker run -d --name app-3000 --network docker_default -p 3000:3000 --restart unless-stopped -v docker_app-data:/app/data -v /home/admin/backups:/backups docker-app`
5. 健康检查: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/health` = 200

不要触发 GitHub Actions 自动部署 (workflow 保留为 workflow_dispatch only)。

## 已踩坑 (见 README + 代码注释)
- 单实例原则: 不要两个 app 容器共 SQLite 卷 (双写)
- 凌晨 (2026-08-06) 磁盘清理: cron `0 4 * * 0 docker image prune -f && docker builder prune -f`
- backup.js 必须 COPY 进镜像, 不能放 /tmp
- middleware runtime = "nodejs" (Edge runtime 不支持 node:crypto)
