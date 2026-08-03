"use client"

import { Toaster as SonnerToaster } from "sonner"

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      theme="system"
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "bg-popover text-popover-foreground border border-border shadow-md rounded-md text-sm",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
        },
      }}
    />
  )
}