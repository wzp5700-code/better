"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Copy, Check } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiFetch } from "@/lib/client/api"
import { clearToken, getDeviceName, hasToken, setDeviceName, setToken } from "@/lib/client/auth-storage"

interface SetupResult {
  deviceId: number
  deviceName: string
  platform: string
  master: boolean
  token: string
  warning?: string
}

export default function SetupPage() {
  const router = useRouter()
  const [stage, setStage] = React.useState<
    "choose" | "new-master" | "join" | "reveal" | "done"
  >("choose")
  const [name, setName] = React.useState("")
  const [platform, setPlatform] = React.useState("web")
  const [pairingCode, setPairingCode] = React.useState("")
  const [result, setResult] = React.useState<SetupResult | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  // If we already have a token, leave setup
  React.useEffect(() => {
    if (hasToken()) router.replace("/")
  }, [router])

  React.useEffect(() => {
    if (stage === "new-master" && !name) {
      const stored = getDeviceName()
      if (stored) setName(stored)
    }
  }, [stage, name])

  async function createMaster() {
    if (!name.trim()) {
      toast.error("请填写设备名")
      return
    }
    setBusy(true)
    try {
      const r = await apiFetch("/api/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), platform }),
      })
      const data = (await r.json()) as SetupResult & { error?: string }
      if (!r.ok) {
        toast.error(data.error ?? "创建失败")
        return
      }
      setResult(data)
      setToken(data.token)
      setDeviceName(data.deviceName)
      setStage("reveal")
    } finally {
      setBusy(false)
    }
  }

  async function pairAsNewDevice() {
    if (!name.trim()) {
      toast.error("请填写设备名")
      return
    }
    if (!pairingCode.trim()) {
      toast.error("请输入配对码")
      return
    }
    setBusy(true)
    try {
      const r = await apiFetch("/api/pair", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pairingCode: pairingCode.trim(),
          name: name.trim(),
          platform,
        }),
      })
      const data = (await r.json()) as SetupResult & { error?: string }
      if (!r.ok) {
        toast.error(data.error ?? "配对失败")
        return
      }
      setResult(data)
      setToken(data.token)
      setDeviceName(data.deviceName)
      setStage("reveal")
    } finally {
      setBusy(false)
    }
  }

  async function copyToken() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.token)
      setCopied(true)
      toast.success("已复制到剪贴板")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("复制失败 — 请手动选中")
    }
  }

  function reset() {
    setResult(null)
    setPairingCode("")
    setStage("choose")
  }

  function signOut() {
    clearToken()
    router.replace("/settings/setup")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="首次设置"
        description="把你的设备和数据绑在一起。"
      />

      {stage === "choose" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">这是第一个设备</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                创建主设备。它会拿到一个长期 token，用来配对其他设备。
              </p>
              <Button onClick={() => setStage("new-master")}>
                创建主设备
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">我已经有主设备</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                在主设备的"设备管理"页面生成配对码，然后在这里输入。
              </p>
              <Button variant="outline" onClick={() => setStage("join")}>
                用配对码加入
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {stage === "new-master" || stage === "join" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {stage === "new-master" ? "主设备信息" : "新设备信息"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="device-name">设备名</Label>
              <Input
                id="device-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="如：我的 iPhone、工作本"
                maxLength={60}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="device-platform">平台</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger id="device-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web">Web 浏览器</SelectItem>
                  <SelectItem value="ios">iOS</SelectItem>
                  <SelectItem value="android">Android</SelectItem>
                  <SelectItem value="windows">Windows</SelectItem>
                  <SelectItem value="macos">macOS</SelectItem>
                  <SelectItem value="linux">Linux</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {stage === "join" ? (
              <div className="space-y-2">
                <Label htmlFor="pair-code">配对码</Label>
                <Input
                  id="pair-code"
                  value={pairingCode}
                  onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  maxLength={24}
                  className="font-mono tracking-widest"
                />
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setStage("choose")}>
                返回
              </Button>
              <Button
                disabled={busy}
                onClick={
                  stage === "new-master" ? createMaster : pairAsNewDevice
                }
              >
                {busy
                  ? "处理中…"
                  : stage === "new-master"
                    ? "创建主设备"
                    : "配对"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {stage === "reveal" && result ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">设备已就绪</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p>
                <strong>{result.deviceName}</strong>{" "}
                <span className="text-muted-foreground">({result.platform})</span>
              </p>
              {result.master ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  这是你的主设备。
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  这是一个普通设备，已与主设备配对。
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>你的 token（仅显示一次）</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded-md border bg-muted px-3 py-2 text-xs">
                  {result.token}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToken}
                  aria-label="复制 token"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {result.warning ??
                  "请把它存到密码管理器。这是唯一一次看到这个 token。"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={() => router.replace("/")}>进入应用</Button>
              <Button variant="ghost" onClick={reset}>
                再来一次
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-xs text-muted-foreground">
        <Link href="/" className="hover:underline">
          返回首页
        </Link>
        <span className="mx-2">·</span>
        <button
          type="button"
          onClick={signOut}
          className="hover:underline"
        >
          清除当前设备
        </button>
      </p>
    </div>
  )
}