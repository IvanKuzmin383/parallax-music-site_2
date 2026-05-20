import { renderSmartlinkOgCoverBuffer, SMARTLINK_COVER_CACHE_CONTROL } from "@/lib/smartlink-cover"

export const runtime = "nodejs"
export const alt = "Обложка релиза"
export const size = { width: 1200, height: 1200 }
export const contentType = "image/jpeg"

interface Props {
  params: Promise<{ slug: string }>
}

export default async function Image({ params }: Props) {
  const { slug } = await params
  const buffer = await renderSmartlinkOgCoverBuffer(slug)
  if (!buffer) {
    return new Response(null, { status: 404 })
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": SMARTLINK_COVER_CACHE_CONTROL,
    },
  })
}
