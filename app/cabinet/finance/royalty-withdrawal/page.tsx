import { redirect } from "next/navigation"

export default function FinanceRoyaltyWithdrawalRedirectPage() {
  redirect("/cabinet/finance/balance?withdraw=1")
}
