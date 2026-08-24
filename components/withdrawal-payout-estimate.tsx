"use client"

import { Label } from "@/components/ui/label"
import {
  estimateIndividualPayout,
  estimateSelfEmployedPayout,
  formatRub,
  type WithdrawalRecipientStatus,
} from "@/lib/withdrawal-payout-calc"

export function WithdrawalPayoutEstimate({
  royalty,
  status,
}: {
  royalty: number
  status: WithdrawalRecipientStatus | ""
}) {
  const individual = estimateIndividualPayout(royalty)
  const selfEmployed = estimateSelfEmployedPayout(royalty)

  return (
    <div className="space-y-3">
      {status === "individual" ? (
        <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
          <p className="font-medium">При текущей сумме роялти расчёт будет следующим:</p>
          <dl className="space-y-1">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">роялти к расчёту</dt>
              <dd>{formatRub(individual.royalty)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">НДФЛ 13%</dt>
              <dd>{formatRub(individual.ndfl)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">страховые взносы 30%</dt>
              <dd>{formatRub(individual.insurance)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t pt-1 font-medium">
              <dt>итоговая сумма к перечислению</dt>
              <dd>{formatRub(individual.net)}</dd>
            </div>
          </dl>
        </div>
      ) : status ? (
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <p>
            К перечислению: <span className="font-medium">{formatRub(royalty)}</span>
            {status === "self_employed"
              ? ". Налог на профессиональный доход уплачиваете самостоятельно."
              : ". Налоги и взносы уплачиваете самостоятельно."}
          </p>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border text-sm">
        <table className="w-full min-w-[320px] border-collapse">
          <caption className="sr-only">Сравнение выплаты физлицу и самозанятому</caption>
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-3 py-2 font-medium"> </th>
              <th className="px-3 py-2 font-medium">Физлицо</th>
              <th className="px-3 py-2 font-medium">Самозанятый</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="px-3 py-2 text-muted-foreground">На карту от лейбла</td>
              <td className="px-3 py-2">{formatRub(individual.net)}</td>
              <td className="px-3 py-2">{formatRub(selfEmployed.netFromLabel)}</td>
            </tr>
            <tr className="border-b">
              <td className="px-3 py-2 text-muted-foreground">Удержит лейбл (НДФЛ + взносы)</td>
              <td className="px-3 py-2">{formatRub(individual.withheld)}</td>
              <td className="px-3 py-2">{formatRub(0)}</td>
            </tr>
            <tr className="border-b">
              <td className="px-3 py-2 text-muted-foreground">Ваш налог сами</td>
              <td className="px-3 py-2">уже в НДФЛ</td>
              <td className="px-3 py-2">≈ {formatRub(selfEmployed.npdEstimate)} (6%)</td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-medium">После всех налогов</td>
              <td className="px-3 py-2 font-medium">{formatRub(individual.net)}</td>
              <td className="px-3 py-2 font-medium">≈ {formatRub(selfEmployed.afterOwnTax)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Расчёт прогнозный и ориентировочный, не является финальной суммой к выплате. Фактические НДФЛ,
        страховые взносы и сумма к перечислению определяются при выплате по НК РФ. Для самозанятого налог
        на профдоход (обычно 6% при выплате от ИП) вы платите сами. Оформить самозанятость можно онлайн на
        сайте ФНС или в приложении «Мой налог», обычно за один день — после этого в заявке выберите статус
        «Самозанятый».
      </p>
    </div>
  )
}
