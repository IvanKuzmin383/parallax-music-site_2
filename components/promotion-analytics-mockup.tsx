"use client"

type MockupType = "streams" | "vk" | "yandex" | "tiktok"

const CHART_POINTS = "4,48 28,42 52,36 76,28 100,18"

function MiniChart({ accentClass = "stroke-primary" }: { accentClass?: string }) {
  return (
    <svg viewBox="0 0 104 56" className="w-full h-16" aria-hidden>
      <polyline
        fill="none"
        className={accentClass}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={CHART_POINTS}
      />
    </svg>
  )
}

export function PromotionAnalyticsMockup({ type }: { type: MockupType }) {
  if (type === "vk") {
    return (
      <div className="relative mx-auto w-full max-w-[280px]">
        <div className="rounded-[2rem] border border-border/80 bg-zinc-950 p-3 shadow-2xl shadow-primary/10">
          <div className="rounded-[1.5rem] bg-zinc-900 p-4 space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">VK Реклама</span>
              <span>12 – 18 мая</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Показы", value: "1,2M", delta: "+32%" },
                { label: "Клики", value: "38 562", delta: "+28%" },
                { label: "CTR", value: "3,09%", delta: "+0,7%" },
                { label: "Потрачено", value: "18 450 ₽", delta: "" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-zinc-950/80 p-2">
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-bold tabular-nums">{item.value}</p>
                  {item.delta ? (
                    <p className="text-[10px] text-emerald-500">{item.delta}</p>
                  ) : null}
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Динамика кликов</p>
              <MiniChart accentClass="stroke-blue-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-2">Плейсменты</p>
              {[
                { name: "VK Музыка", pct: 64 },
                { name: "Лента", pct: 18 },
                { name: "Истории", pct: 9 },
              ].map((row) => (
                <div key={row.name} className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] w-16 shrink-0">{row.name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${row.pct}%` }} />
                  </div>
                  <span className="text-[10px] tabular-nums text-muted-foreground">{row.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (type === "yandex") {
    return (
      <div className="relative mx-auto w-full max-w-[360px]">
        <div className="rounded-xl border border-border/80 bg-zinc-950 p-2 shadow-2xl shadow-primary/10">
          <div className="rounded-lg bg-zinc-900 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">Яндекс Директ</span>
              <span className="text-muted-foreground">12 – 18 мая</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Просмотры", value: "1 246 540", delta: "+28%" },
                { label: "Клики", value: "38 742", delta: "+34%" },
                { label: "CTR", value: "3,11%", delta: "+0,6%" },
                { label: "Конверсии", value: "1 856", delta: "+42%" },
              ].map((item) => (
                <div key={item.label} className="rounded-md bg-zinc-950/80 p-2">
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  <p className="text-xs font-bold tabular-nums">{item.value}</p>
                  <p className="text-[10px] text-emerald-500">{item.delta}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Динамика кликов</p>
              <MiniChart />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (type === "tiktok") {
    return (
      <div className="relative mx-auto w-full max-w-[280px]">
        <div className="rounded-[2rem] border border-border/80 bg-zinc-950 p-3 shadow-2xl shadow-primary/10">
          <div className="rounded-[1.5rem] bg-zinc-900 p-4 space-y-3">
            <p className="text-xs font-semibold text-foreground">TikTok Analytics</p>
            <div className="space-y-2">
              {[
                { label: "Просмотры", value: "1,2M", delta: "+156%" },
                { label: "Охват", value: "842K", delta: "+132%" },
                { label: "Лайки", value: "74,3K", delta: "+98%" },
              ].map((item) => (
                <div key={item.label} className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground">{item.label}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold tabular-nums">{item.value}</span>
                    <span className="text-[10px] text-emerald-500 ml-1">{item.delta}</span>
                  </div>
                </div>
              ))}
            </div>
            <MiniChart />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <div className="rounded-[2rem] border border-border/80 bg-zinc-950 p-3 shadow-2xl shadow-primary/10 rotate-3">
        <div className="rounded-[1.5rem] bg-zinc-900 p-4 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">Прослушивания</p>
            <p className="text-3xl font-bold tabular-nums tracking-tight">128 750</p>
            <p className="text-xs text-emerald-500 mt-1">↑ 37,6% за последние 7 дней</p>
          </div>
          <MiniChart />
          <div>
            <p className="text-xs text-muted-foreground mb-2">Топ городов</p>
            {[
              { city: "Москва", value: 28560 },
              { city: "Санкт-Петербург", value: 12430 },
              { city: "Екатеринбург", value: 6820 },
            ].map((row) => (
              <div key={row.city} className="flex items-center gap-2 mb-2">
                <span className="text-[10px] w-24 shrink-0 truncate">{row.city}</span>
                <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(row.value / 28560) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {row.value.toLocaleString("ru-RU")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
