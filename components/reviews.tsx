import Link from "next/link"
import { unstable_noStore as noStore } from "next/cache"
import { getPublishedReviews } from "@/lib/reviews"
import { ReviewsCarousel } from "@/components/reviews-carousel"

export async function Reviews() {
  noStore()
  const reviews = await getPublishedReviews(24)
  if (reviews.length === 0) return null

  return (
    <section id="reviews" className="py-16 border-y border-border bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="max-w-3xl">
            <h2 className="text-4xl md:text-6xl font-bold mb-3">
              <span className="text-foreground">Отзывы</span>{" "}
              <span className="text-primary">о нас</span>
            </h2>
            <p className="text-lg text-muted-foreground text-pretty">
              Отзывы артистов и партнеров о работе с нами
            </p>
          </div>
          <Link
            href="/review"
            className="text-sm text-primary hover:underline whitespace-nowrap mt-2"
          >
            Оставить отзыв
          </Link>
        </div>

        <ReviewsCarousel reviews={reviews} />
      </div>
    </section>
  )
}
