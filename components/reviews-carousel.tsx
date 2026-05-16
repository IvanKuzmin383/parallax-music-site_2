"use client"

import { useRef } from "react"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"
import { Button } from "@/components/ui/button"

type ReviewCard = {
  id: string
  authorName: string
  rating: number
  text: string
}

function renderStars(rating: number) {
  return (
    <div className="flex items-center gap-1" aria-label={`Оценка ${rating} из 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={
            index < rating
              ? "h-4 w-4 fill-primary text-primary"
              : "h-4 w-4 text-muted-foreground/40"
          }
        />
      ))}
    </div>
  )
}

function truncateText(text: string, max = 180) {
  if (text.length <= max) return text
  return `${text.slice(0, max).trimEnd()}...`
}

export function ReviewsCarousel({ reviews }: { reviews: ReviewCard[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null)

  const scrollByPage = (direction: "left" | "right") => {
    const track = trackRef.current
    if (!track) return
    const amount = track.clientWidth
    track.scrollBy({
      left: direction === "right" ? amount : -amount,
      behavior: "smooth",
    })
  }

  const pages: ReviewCard[][] = []
  for (let i = 0; i < reviews.length; i += 3) {
    pages.push(reviews.slice(i, i + 3))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => scrollByPage("left")}
          aria-label="Прокрутить отзывы влево"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => scrollByPage("right")}
          aria-label="Прокрутить отзывы вправо"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={trackRef}
        className="flex overflow-x-auto snap-x snap-mandatory pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {pages.map((page, pageIndex) => (
          <div
            key={pageIndex}
            className="snap-start shrink-0 w-full grid gap-4 md:grid-cols-3 pr-1"
          >
            {page.map((review) => (
              <article
                key={review.id}
                className="rounded-2xl border bg-card p-5 shadow-sm min-h-[220px]"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="font-semibold">{review.authorName}</p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {review.rating}/5
                  </span>
                </div>
                <div className="mb-3">{renderStars(review.rating)}</div>
                <p className="text-sm leading-6 text-muted-foreground whitespace-pre-wrap">
                  {truncateText(review.text)}
                </p>
              </article>
            ))}
          </div>
        ))}
      </div>

      <div className="pt-2 flex justify-center">
        <Button asChild>
          <a
            href="https://yandex.ru/profile/45544244954"
            target="_blank"
            rel="noopener noreferrer"
          >
            Яндекс отзывы
          </a>
        </Button>
      </div>
    </div>
  )
}
