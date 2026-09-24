import { redirect } from "next/navigation"

/** Тикеты убраны — поддержка через плавающий чат в кабинете. */
export default function SupportRedirectPage() {
  redirect("/cabinet")
}
