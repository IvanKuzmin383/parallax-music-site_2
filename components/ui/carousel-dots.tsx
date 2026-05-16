'use client'

import * as React from 'react'
import { useCarousel } from '@/components/ui/carousel'
import { cn } from '@/lib/utils'

export function CarouselDots({ className }: { className?: string }) {
  const { api } = useCarousel()
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [scrollSnaps, setScrollSnaps] = React.useState<number[]>([])

  const onSelect = React.useCallback(() => {
    if (!api) return
    setSelectedIndex(api.selectedScrollSnap())
  }, [api])

  React.useEffect(() => {
    if (!api) return

    setScrollSnaps(api.scrollSnapList())
    setSelectedIndex(api.selectedScrollSnap())

    api.on('select', onSelect)
    api.on('reInit', onSelect)

    return () => {
      api.off('select', onSelect)
      api.off('reInit', onSelect)
    }
  }, [api, onSelect])

  const scrollTo = React.useCallback(
    (index: number) => {
      if (!api) return
      api.scrollTo(index)
    },
    [api],
  )

  if (scrollSnaps.length <= 1) {
    return null
  }

  return (
    <div
      className={cn('flex justify-center gap-2 mt-4', className)}
      data-slot="carousel-dots"
    >
      {scrollSnaps.map((_, index) => (
        <button
          key={index}
          type="button"
          className={cn(
            'h-2 w-2 rounded-full transition-all',
            index === selectedIndex
              ? 'bg-primary w-6'
              : 'bg-muted-foreground/50 hover:bg-muted-foreground/75',
          )}
          onClick={() => scrollTo(index)}
          aria-label={`Перейти к слайду ${index + 1}`}
        />
      ))}
    </div>
  )
}
