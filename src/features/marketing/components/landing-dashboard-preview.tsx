"use client";

import {
  LayoutDashboard,
  ShoppingBag,
  Store,
  Package,
  Users,
  Wallet,
  Brain,
  Bell,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartGradient,
  ChartTooltip,
  ChartTooltipContent,
  chartAxisProps,
  chartGridProps,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import {
  salesTrend,
  channelData,
  channelMonthly,
  kpis,
  outlets,
  aiInsights,
  notifications,
  formatINR,
  formatNum,
} from "@/lib/mock-data";

const NAV_ITEMS = [
  { icon: LayoutDashboard, active: true },
  { icon: ShoppingBag },
  { icon: Store },
  { icon: Package },
  { icon: Users },
  { icon: Wallet },
  { icon: Brain },
];

const HERO_CHART_CONFIG = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  profit: { label: "Profit", color: "var(--chart-2)" },
};

const CHANNEL_BAR_CONFIG = {
  swiggy: { label: "Swiggy", color: "var(--chart-3)" },
  zomato: { label: "Zomato", color: "var(--chart-5)" },
};

const CHANNEL_PIE_CONFIG = Object.fromEntries(
  channelData.map((slice, index) => [
    slice.name.toLowerCase().replace(/[^a-z]/g, ""),
    {
      label: slice.name,
      color: `var(--chart-${(index % 5) + 1})`,
    },
  ]),
);

type LandingDashboardPreviewProps = {
  variant?: "hero" | "full";
  className?: string;
};

export function LandingDashboardPreview({
  variant = "hero",
  className,
}: LandingDashboardPreviewProps) {
  const isFull = variant === "full";
  const weekRevenue = salesTrend.reduce((sum, row) => sum + row.revenue, 0);
  const topOutlets = outlets.slice(0, isFull ? 5 : 3);
  const primaryInsight = aiInsights[0];
  const recentAlerts = notifications.slice(0, isFull ? 4 : 2);

  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden",
        "relative overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-card ring-1 ring-primary/5 transition-shadow hover:border-primary/25 hover:shadow-glow",
        isFull ? "min-h-[420px] sm:min-h-[480px]" : "min-h-[320px] sm:min-h-[360px]",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-brand opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />

      <div className="flex h-full min-h-0">
        <aside className="flex w-12 shrink-0 flex-col items-center gap-2 border-r border-border/50 bg-sidebar/80 py-4 sm:w-14">
          {NAV_ITEMS.map(({ icon: Icon, active }, i) => (
            <div
              key={i}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                active
                  ? "bg-gradient-brand text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
          ))}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-3 sm:p-4">
          <div className="mb-3 flex shrink-0 items-center justify-between gap-2 border-b border-border/50 pb-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Unified intelligence
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                  {formatINR(weekRevenue)}
                </span>
                <span className="shrink-0 text-xs font-semibold text-success">
                  +{kpis.revenue.delta}%
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">Last 7 days · all outlets</p>
            </div>
            <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
              {channelData.slice(0, 2).map((ch) => (
                <span
                  key={ch.name}
                  className="rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-[10px] font-medium"
                >
                  {ch.name}
                </span>
              ))}
            </div>
          </div>

          <div
            className={cn(
              "grid min-h-0 flex-1 gap-2 overflow-hidden",
              isFull ? "grid-cols-1 lg:grid-cols-12" : "grid-cols-1",
            )}
          >
            <div
              className={cn(
                "flex min-h-0 min-w-0 flex-col gap-2 overflow-hidden",
                isFull ? "lg:col-span-7" : "",
              )}
            >
              <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: "Revenue", value: formatINR(kpis.revenue.value), delta: kpis.revenue },
                  { label: "Orders", value: formatNum(kpis.orders.value), delta: kpis.orders },
                  { label: "AOV", value: formatINR(kpis.aov.value), delta: kpis.aov },
                  {
                    label: "Outlets",
                    value: String(kpis.outlets.value),
                    delta: kpis.outlets,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-border/50 bg-card/80 px-2 py-2 shadow-sm transition hover:border-primary/25 hover:bg-muted/25"
                  >
                    <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-semibold sm:text-sm">{item.value}</p>
                    {item.delta.delta !== 0 && (
                      <p
                        className={cn(
                          "text-[9px] font-medium",
                          item.delta.trend === "up"
                            ? "text-success"
                            : item.delta.trend === "down"
                              ? "text-destructive"
                              : "text-muted-foreground",
                        )}
                      >
                        {item.delta.trend === "up" ? "+" : item.delta.trend === "down" ? "" : ""}
                        {item.delta.delta}%
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="min-h-0 flex-1 rounded-xl border border-border/50 bg-card/50 p-2.5">
                <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">
                  Revenue & profit
                </p>
                <ChartContainer
                  id="landing-revenue"
                  className={cn(
                    "aspect-auto w-full min-w-0 border-0 bg-transparent shadow-none",
                    isFull ? "h-[140px]" : "h-[120px]",
                  )}
                  config={HERO_CHART_CONFIG}
                >
                  <AreaChart data={salesTrend} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                    <defs>
                      <ChartGradient
                        name="revenue"
                        colorVar="--color-revenue"
                        startOpacity={0.4}
                        endOpacity={0}
                      />
                      <ChartGradient
                        name="profit"
                        colorVar="--color-profit"
                        startOpacity={0.3}
                        endOpacity={0}
                      />
                    </defs>
                    <CartesianGrid vertical={false} {...chartGridProps} />
                    <XAxis
                      dataKey="day"
                      {...chartAxisProps}
                      tick={{ ...chartAxisProps.tick, fontSize: 9 }}
                      tickMargin={4}
                    />
                    <YAxis hide width={0} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--color-revenue)"
                      strokeWidth={2}
                      fill="url(#chart-landing-revenue-revenue)"
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stroke="var(--color-profit)"
                      strokeWidth={1.5}
                      fill="url(#chart-landing-revenue-profit)"
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            </div>

            <div
              className={cn(
                "flex min-h-0 min-w-0 flex-col gap-2 overflow-hidden",
                isFull ? "lg:col-span-5" : "mt-1",
              )}
            >
              {isFull ? (
                <div className="grid min-h-0 flex-1 grid-cols-2 gap-2">
                  <div className="flex min-h-0 flex-col rounded-xl border border-border/50 bg-card/50 p-2.5">
                    <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">
                      Channel mix
                    </p>
                    <ChartContainer
                      className="aspect-auto h-[100px] min-w-0 flex-1 border-0 bg-transparent shadow-none"
                      config={CHANNEL_PIE_CONFIG}
                    >
                      <PieChart>
                        <Pie
                          data={channelData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="42%"
                          outerRadius="72%"
                          paddingAngle={3}
                        >
                          {channelData.map((slice) => (
                            <Cell key={slice.name} fill={slice.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ChartContainer>
                  </div>
                  <div className="flex min-h-0 flex-col rounded-xl border border-border/50 bg-card/50 p-2.5">
                    <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">
                      Delivery trend
                    </p>
                    <ChartContainer
                      className="aspect-auto h-[100px] min-w-0 flex-1 border-0 bg-transparent shadow-none"
                      config={CHANNEL_BAR_CONFIG}
                    >
                      <BarChart
                        data={channelMonthly.slice(-4)}
                        margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid vertical={false} {...chartGridProps} />
                        <XAxis
                          dataKey="month"
                          {...chartAxisProps}
                          tick={{ ...chartAxisProps.tick, fontSize: 8 }}
                          tickMargin={4}
                        />
                        <YAxis hide width={0} />
                        <Bar dataKey="swiggy" fill="var(--chart-3)" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="zomato" fill="var(--chart-5)" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border/50 bg-card/50 p-2.5">
                  <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">
                    Delivery channels
                  </p>
                  <ChartContainer
                    className="aspect-auto h-[88px] w-full min-w-0 border-0 bg-transparent shadow-none"
                    config={CHANNEL_BAR_CONFIG}
                  >
                    <BarChart
                      data={channelMonthly.slice(-4)}
                      margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} {...chartGridProps} />
                      <XAxis
                        dataKey="month"
                        {...chartAxisProps}
                        tick={{ ...chartAxisProps.tick, fontSize: 8 }}
                        tickMargin={4}
                      />
                      <YAxis hide width={0} />
                      <Bar dataKey="swiggy" fill="var(--chart-3)" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="zomato" fill="var(--chart-5)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </div>
              )}

              <div className="min-h-0 shrink-0 space-y-1.5 overflow-hidden">
                <p className="text-[10px] font-medium text-muted-foreground">Top outlets</p>
                <ul className="space-y-1">
                  {topOutlets.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border/40 bg-muted/15 px-2 py-1.5 text-[10px] transition hover:border-primary/20"
                    >
                      <span className="min-w-0 truncate font-medium">{o.name}</span>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {formatINR(o.revenue)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-2 grid shrink-0 gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-success/25 bg-success/5 p-2.5">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-success" />
                <span className="text-[10px] font-semibold text-success">AI insight</span>
              </div>
              <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                {primaryInsight.title}: {primaryInsight.body}
              </p>
            </div>
            <div className="space-y-1 rounded-lg border border-border/50 bg-muted/15 p-2">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                <Bell className="h-3 w-3" />
                Live alerts
              </div>
              {recentAlerts.map((n) => (
                <p key={n.id} className="truncate text-[10px] text-foreground/90">
                  {n.title}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
