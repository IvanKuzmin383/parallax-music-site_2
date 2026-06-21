import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8", className)}>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {description ? <p className="text-muted-foreground text-sm md:text-base max-w-2xl">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2 shrink-0">{children}</div> : null}
    </div>
  )
}
