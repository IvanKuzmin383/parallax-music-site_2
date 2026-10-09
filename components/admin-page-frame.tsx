import { cn } from "@/lib/utils"

/** Полная ширина рабочей области админки (как у раздела «Музыка для бизнеса»). */
export const ADMIN_PAGE_FRAME_CLASS = "mx-auto w-full max-w-none px-4"

export function AdminPageFrame({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn(ADMIN_PAGE_FRAME_CLASS, className)}>{children}</div>
}
