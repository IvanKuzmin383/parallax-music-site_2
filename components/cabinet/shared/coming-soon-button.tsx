import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface ComingSoonButtonProps extends React.ComponentProps<typeof Button> {
  label?: string
  tooltip?: string
}

export function ComingSoonButton({
  label = "Скоро",
  tooltip = "Функция появится в ближайших обновлениях",
  className,
  children,
  ...props
}: ComingSoonButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button disabled className={cn("pointer-events-none", className)} {...props}>
              {children ?? label}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
