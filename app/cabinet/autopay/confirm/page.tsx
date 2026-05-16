"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

function ConfirmBody() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<"loading" | "ok" | "err">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("err")
      setMessage("Нет токена в ссылке")
      return
    }
    void (async () => {
      try {
        const res = await fetch("/api/cabinet/subscription/autopay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "confirm", token }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok) {
          setStatus("ok")
          setMessage("Автопродление отключено.")
        } else {
          setStatus("err")
          setMessage(typeof data.error === "string" ? data.error : "Не удалось подтвердить")
        }
      } catch {
        setStatus("err")
        setMessage("Ошибка сети")
      }
    })()
  }, [token])

  return (
    <div className="min-h-screen bg-background p-4 pt-24 flex flex-col items-center justify-center gap-4 max-w-md mx-auto text-center">
      {status === "loading" ?
        <>
          <Spinner className="h-8 w-8" />
          <p className="text-muted-foreground text-sm">Подтверждение…</p>
        </>
      : <>
          <h1 className="text-xl font-semibold">
            {status === "ok" ? "Готово" : "Ошибка"}
          </h1>
          <p className="text-sm text-muted-foreground">{message}</p>
          <Button asChild>
            <Link href="/cabinet/profile">В профиль</Link>
          </Button>
        </>
      }
    </div>
  )
}

export default function AutopayConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <ConfirmBody />
    </Suspense>
  )
}
