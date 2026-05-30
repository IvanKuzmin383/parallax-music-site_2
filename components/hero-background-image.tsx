import { HERO_BACKGROUND } from "@/lib/hero-background"

type HeroBackgroundImageProps = {
  alt: string
}

/**
 * LCP-фон без next/image: nginx отдаёт WebP/JPG напрямую, без CPU Sharp на Node.
 */
export function HeroBackgroundImage({ alt }: HeroBackgroundImageProps) {
  return (
    <picture className="absolute inset-0 block h-full w-full">
      <source srcSet={HERO_BACKGROUND.webp} type="image/webp" />
      <img
        src={HERO_BACKGROUND.jpg}
        alt={alt}
        className="h-full w-full object-cover opacity-30"
        fetchPriority="high"
        decoding="async"
      />
    </picture>
  )
}
