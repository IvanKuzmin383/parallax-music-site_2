import { redirect } from "next/navigation"

export default function FinanceTransactionsRedirectPage() {
  redirect("/cabinet/finance/balance#history")
}
