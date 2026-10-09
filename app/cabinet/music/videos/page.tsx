import { redirect } from "next/navigation"

export default function MusicVideosRedirectPage() {
  redirect("/cabinet/music/distribution?tab=videos")
}
