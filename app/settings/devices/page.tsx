"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Copy, Check, Trash2, Smartphone } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadingBlock } from "@/components/shared/loading-block"
import { apiFetch } from "@/lib/client/api"
import { clearToken, getDeviceName, hasToken } from "@/lib/client/auth-storage"

interface DeviceRow {
  id: number
  name: string
  platform: string
  master: boolean
  createdAt: string
  lastSeenAt: string | null
  revokedAt: string | null
}

export default function DevicesPage() {
  const router = useRouter()
  const [data, setData] = React.useState<DeviceRow[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [pairCode, setPairCode] = React.useState<string | null>(null)
  const [pairExpiresAt, setPairExpiresAt] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!hasToken()) {
      router.replace("/settings/setup")
      return
    }
    void loadDevices()
  }, [router])

  async function loadDevices() {
    try {
      const r = await apiFetch("/api/devices", { cache: "no-store" })
      if (!r.ok) {
        const body = await r.text().catch(() => "")
        setError(`加载失败：${r.status} ${body}`)
        return
      }
      const rows = (await r.json()) as DeviceRow[]
      setData(rows)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知错误")
    }
  }

  async function generateCode() {
    setBusy(true)
    try {
      const r = await apiFetch("/api/pairing-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
      const body = (await r.json()) as {
        pairingCode?: string
        expiresAt?: string
        error?: string
      }
      if (!r.ok || !body.pairingCode) {
        toast.error(body.error ?? "生成失败")
        return
      }
      setPairCode(body.pairingCode)
      setPairExpiresAt(body.expiresAt ?? null)
      setCopied(false)
    } finally {
      setBusy(false)
    }
  }

  async function copyCode() {
    if (!pairCode) return
    try {
      await navigator.clipboard.writeText(pairCode)
      setCopied(true)
      toast.success("已复制配对码")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("复制失败 — 请手动选中")
    }
  }

  async function revoke(id: number, name: string) {
    if (!window.confirm(`撤销「${name}」？该设备会立刻断线。`)) return
    const r = await apiFetch("/api/devices", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (!r.ok) {
      const body = (await r.json().catch(() => null)) as {
        error?: string
      } | null
      toast.error(body?.error ?? `撤销失败：${r.status}`)
      return
    }
    toast.success("已撤销")
    await loadDevices()
  }

  function signOut() {
    clearToken()
    router.replace("/settings/setup")
  }

  if (error) {
    return (
      <EmptyState
        title="加载失败"
        description={error}
        action={
          <Button variant="outline" onClick={() => router.replace("/settings/setup")}>
            重新设置
          </Button>
        }
      />
    )
  }

  if (!data) return <LoadingBlock lines={3} />

  const me = data.find((d) => d.name === (getDeviceName() ?? ""))
  const hasMaster = data.some((d) => d.master && !d.revokedAt)

  return (
    <div className="space-y-6">
      <PageHeader
        title="设备"
        description="管理所有接入这个后端的设备。"
      />

      {hasMaster ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">配对新设备</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              生成一个 5 分钟有效的配对码，在新设备的"首次设置"页输入即可。
            </p>
            {pairCode ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded-md border bg-muted px-3 py-2 font-mono text-lg tracking-widest">
                    {pairCode}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyCode}
                    aria-label="复制配对码"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {pairExpiresAt ? (
                  <p className="text-xs text-muted-foreground">
                    过期时间：
                    {new Date(pairExpiresAt).toLocaleString("zh-CN")}
                  </p>
                ) : null}
              </div>
            ) : null}
            <Button onClick={generateCode} disabled={busy}>
              {busy ? "生成中…" : pairCode ? "重新生成" : "生成配对码"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          已接入设备（{data.length}）
        </h2>
        {data.length === 0 ? (
          <EmptyState title="没有设备" />
        ) : (
          <div className="space-y-2">
            {data.map((d) => (
              <Card key={d.id}>
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{d.name}</span>
                        {d.master ? (
                          <Badge variant="secondary" className="font-normal">
                            主设备
                          </Badge>
                        ) : null}
                        {d.revokedAt ? (
                          <Badge variant="outline" className="font-normal">
                            已撤销
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {d.platform} · 注册于{" "}
                        {new Date(d.createdAt).toLocaleDateString("zh-CN")}
                        {d.lastSeenAt ? (
                          <>
                            {" · 最近活跃 "}
                            {new Date(d.lastSeenAt).toLocaleString("zh-CN")}
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!d.revokedAt && d.id !== me?.id ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revoke(d.id, d.name)}
                        aria-label={`撤销 ${d.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

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
          退出当前设备
        </button>
      </p>
    </div>
  )
}