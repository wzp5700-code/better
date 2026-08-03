# 部署指南

把仓库部署到 VPS + 启用 GitHub Actions 自动部署的完整步骤。

## 前置

- VPS（Linux, Ubuntu 22.04+ 或 Debian 12+），root 权限
- 一个域名，A 记录指向 VPS IP
- GitHub 仓库（fork 或 import）：`https://github.com/wzp5700-code/better`

---

## 一、VPS 一次性准备

SSH 登录 VPS：

```bash
ssh root@your-vps-ip
```

### 1. 装 Docker

```bash
# Ubuntu / Debian
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
docker --version
docker compose version
```

### 2. 建 deploy 用户（不用 root 跑容器）

```bash
useradd -m -s /bin/bash deploy
usermod -aG docker deploy
```

后续操作都 `ssh deploy@your-vps-ip`。

### 3. 配置 deploy key（GitHub Actions 自动部署用）

**在 VPS 上**：

```bash
sudo -iu deploy
ssh-keygen -t ed25519 -N "" -f ~/.ssh/github_actions
cat ~/.ssh/github_actions.pub
# 把公钥粘到 GitHub repo → Settings → Deploy keys → Add key
# ✅ Allow write access 不需要勾选（我们只 pull）
```

**GitHub 私钥**也要填到 Secrets（在步骤 2 用）：

```bash
cat ~/.ssh/github_actions
# 整个输出（包含 -----BEGIN...-----）复制
```

### 4. 第一次手动部署（拉代码 + 起容器）

```bash
sudo -iu deploy
git clone https://github.com/wzp5700-code/better.git personal-growth-desk
cd personal-growth-desk
cp .env.example .env
nano .env
```

填两项：

```dotenv
DOMAIN=your.domain.com
ALLOWED_ORIGINS=https://your.domain.com
```

启动：

```bash
mkdir -p secrets backups
docker compose -f docker/docker-compose.yml up -d --build
docker compose -f docker/docker-compose.yml ps
docker compose -f docker/docker-compose.yml logs -f caddy
# 等 Caddy 拿到证书（首次约 30 秒）
```

打开 `https://your.domain.com/`：
- 应自动跳到 `/settings/setup`
- 点"创建主设备" → 拿到 master token（**立即复制**）

✅ Web 端可用。

---

## 二、GitHub Actions 自动部署

### 1. 配 secrets

GitHub 仓库 → Settings → Secrets and variables → Actions → **New repository secret**：

| Secret 名 | 值 |
|---|---|
| `VPS_HOST` | VPS 的 IP 或域名，如 `1.2.3.4` |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | 上面第 3 步复制的私钥全文（含 `-----BEGIN...-----`） |
| `VPS_PORT` | `22`（默认） |

### 2. 触发方式

`.github/workflows/deploy.yml` 已经配好：

- `push` 到 `main` 自动部署
- 也能在 GitHub Actions 页面手动 `Run workflow`

### 3. 第一次 push 后

```powershell
cd C:\Users\15008\projects\personal-growth-desk

git add -A
git commit -m "feat: 初始 MVP + 跨平台 scaffold"
git push -u origin main
```

去 GitHub → Actions 标签页看部署日志。成功后 VPS 上的容器自动更新到最新代码。

---

## 三、启用推送（可选）

### 1. Firebase 项目

1. https://console.firebase.google.com/ → 新建项目
2. Project Settings → **Service Accounts** → Generate New Private Key → 下载 JSON
3. Project Settings → Cloud Messaging → **Apple apps**：
   - 上传 APNs `.p8` 认证 key
   - 填 Team ID + Bundle ID（`com.wzp5700.better` 或你想要的）

### 2. VPS 部署

```bash
sudo -iu deploy
cd personal-growth-desk
# 假设 fcm.json 已经在本地
scp /path/to/fcm.json deploy@your-vps-ip:~/personal-growth-desk/secrets/fcm.json
chmod 600 secrets/fcm.json
```

编辑 `docker/docker-compose.yml`，取消 `app` 服务里 FCM 相关的注释：

```yaml
services:
  app:
    environment:
      FCM_SERVICE_ACCOUNT_JSON_PATH: /run/secrets/fcm.json
    volumes:
      - ./secrets/fcm.json:/run/secrets/fcm.json:ro
```

重启：

```bash
docker compose -f docker/docker-compose.yml up -d --build app
docker compose -f docker/docker-compose.yml logs -f app | grep push
```

iOS App 启动后会自动调 `/api/push/register` 注册 FCM token。

---

## 四、备份与恢复

### 手动备份

```bash
docker compose -f docker/docker-compose.yml exec -T backup /app/docker/backup.sh
ls -lh /backups/
```

### 恢复

```bash
# 1. 停服务
docker compose -f docker/docker-compose.yml down

# 2. 拷贝备份到 data/
cp /backups/app-YYYY-MM-DDTHH-MM-SSZ.db ./data/app.db

# 3. 重启
docker compose -f docker/docker-compose.yml up -d
```

### 自动备份

`backup` 容器已配好，默认每天凌晨本地时间运行一次，保留 30 天滚动。在 `docker/docker-compose.yml` 里改 `BACKUP_KEEP_DAYS`。

---

## 五、多设备配对（手动）

1. 主设备浏览器：`https://your.domain.com/settings/devices`
2. 点"生成配对码" → 5 分钟有效
3. 新设备的浏览器：`https://your.domain.com/settings/setup`
4. 选"用配对码加入" → 输入短码

---

## 六、域名 / TLS

- DNS A 记录：`your.domain.com → VPS IP`
- Caddy 自动申请 Let's Encrypt 证书（80/443 需放行）
- 续期也是 Caddy 自动处理

---

## 七、常见问题

**Caddy 起不来 / 拿不到证书**
```bash
docker compose -f docker/docker-compose.yml logs caddy
# 检查：域名是否正确解析、DNS A 记录是否生效、80/443 是否被防火墙拦住
```

**API 一直 401**
- 检查 `/settings/setup` 是否跑过、token 是否在 localStorage
- 检查 `DATABASE_URL` 是否同一个文件（容器挂载的是 `./data/app.db`）

**数据库迁移没跑**
```bash
docker compose -f docker/docker-compose.yml exec app node -e "require('./.next/standalone/node_modules/drizzle-orm/better-sqlite3/migrator.js')"
# 或：手动跑 pnpm db:migrate 后重启
```

**改代码后没生效**
- GH Actions 跑成功没？去 Actions 标签看
- VPS 上 `docker compose ps` 看容器时间戳
- 浏览器硬刷新（Ctrl+F5）