import { redirect } from "next/navigation"

export default function CabinetAchievementsPage() {
  redirect("/cabinet/settings?tab=achievements")
}
