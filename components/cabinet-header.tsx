"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function CabinetHeader() {
  const handleLogout = async () => {
    try {
      await fetch("/api/cabinet/auth", { method: "DELETE", credentials: "include" })
    } catch {
      // ignore
    }
    window.location.href = "/cabinet"
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl md:text-2xl font-bold tracking-tighter flex-shrink-0">
          <span className="text-foreground">PARALLAX</span>
          <span className="text-primary ml-1">MUSIC</span>
        </Link>

        <Button
          size="sm"
          className="uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handleLogout}
        >
          Выйти
        </Button>
      </div>
    </header>
  )
}
