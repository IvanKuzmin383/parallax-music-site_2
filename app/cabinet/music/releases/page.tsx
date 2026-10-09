import { redirect } from "next/navigation"

export default function MusicReleasesRedirectPage() {
  redirect("/cabinet/music/distribution?tab=releases")
}
