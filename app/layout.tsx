import type { Metadata } from "next"
import { Noto_Sans_SC } from "next/font/google"
import { ThemeProvider } from "@/components/layout/theme-provider"
import { QueryProvider } from "@/components/shared/query-provider"
import { Toaster } from "@/components/shared/toaster"
import { OfflineNotice } from "@/components/shared/offline-notice"
import { AppShell } from "@/components/layout/app-shell"
import "./globals.css"

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "个人成长台",
  description: "安静地记录行动与反思",
  manifest: "/manifest.webmanifest",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={notoSansSC.variable}>
      <body className="antialiased min-h-dvh bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
        >
          <QueryProvider>
            <AppShell>{children}</AppShell>
            <Toaster />
            <OfflineNotice />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}