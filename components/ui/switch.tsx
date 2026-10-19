'use client'

import * as React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'

import { cn } from '@/lib/utils'

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border shadow-xs transition-colors outline-none',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        // Выкл: заметный «пустой» трек
        'data-[state=unchecked]:border-border data-[state=unchecked]:bg-muted',
        // Вкл: явная заливка (не зависит от тусклого primary в dark)
        'data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block size-5 rounded-full ring-0 transition-transform',
          'data-[state=checked]:translate-x-[1.25rem] data-[state=unchecked]:translate-x-0.5',
          'data-[state=unchecked]:bg-foreground/80',
          'data-[state=checked]:bg-white',
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
