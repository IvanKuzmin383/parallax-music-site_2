import { redirect } from "next/navigation"

/** Legacy URL - canonical page is /tools/smartlinks */
export default function SmartlinksMarketingPage() {
  redirect("/tools/smartlinks")
}
