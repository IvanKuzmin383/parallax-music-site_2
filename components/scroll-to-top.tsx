"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

export function ScrollToTop() {
  const pathname = usePathname() ?? ""
  const [isVisible, setIsVisible] = useState(false)
  const hideInCabinet = pathname === "/cabinet" || pathname.startsWith("/cabinet/")

  useEffect(() => {
    if (hideInCabinet) {
      setIsVisible(false)
      return
    }

    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 300)
    }

    toggleVisibility()
    window.addEventListener("scroll", toggleVisibility)
    return () => {
      window.removeEventListener("scroll", toggleVisibility)
    }
  }, [hideInCabinet])

  if (hideInCabinet) return null

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className={cn(
        "fixed bottom-8 right-8 z-50 rounded-full shadow-lg transition-all duration-300",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        "size-12",
        isVisible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      )}
      aria-label="Наверх"
    >
      <ChevronUp className="size-6" />
    </Button>
  )
}

