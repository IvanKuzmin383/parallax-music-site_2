"use client"

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary)",
  "var(--muted-foreground)",
]

type PieDatum = { label: string; value: number }

export function CasePieChart({
  title,
  caption,
  data,
  donut = true,
  valueSuffix = "",
}: {
  title: string
  caption?: string
  data: PieDatum[]
  donut?: boolean
  valueSuffix?: string
}) {
  const chartData = data.map((d) => ({ name: d.label, value: d.value }))

  return (
    <figure className="my-6 rounded-lg border border-border bg-card p-6">
      <p className="text-sm font-medium text-foreground mb-4">{title}</p>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={donut ? "55%" : 0}
              outerRadius="80%"
              paddingAngle={2}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) =>
                `${value.toLocaleString("ru-RU")}${valueSuffix}`
              }
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{ fontSize: "12px", lineHeight: "1.4" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {caption && (
        <figcaption className="text-sm text-muted-foreground text-center mt-4 italic">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
