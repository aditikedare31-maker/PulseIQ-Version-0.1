'use client'
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Activity,
  BarChart3,
  Brain,
  Zap,
  Users,
  Boxes,
  Building2,
  CheckCircle2,
  Star,
  Plug2,
  Database,
  LineChart,
  Shield,
  Workflow,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LandingNavbar } from "./components/landing-navbar";
import { LandingFooter } from "./components/landing-footer";
import { LandingDashboardPreviewLazy } from "./components/landing-dashboard-preview-lazy";
import { AiInsightCard } from "@/components/dashboard/ai-insight-card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  outlets,
  kpis,
  salesTrend,
  channelMonthly,
  aiInsights,
  integrations,
  formatINR,
  formatNum,
} from "@/lib/mock-data";

const AI_BAR_CONFIG = {
  swiggy: {
    label: "Swiggy",
    color: "var(--chart-3)",
  },
  zomato: {
    label: "Zomato",
    color: "var(--chart-5)",
  },
} as const;

const LandingTestimonials = dynamic(
  () => import("./components/landing-testimonials").then((mod) => ({
    default: mod.LandingTestimonials,
  })),
  {
    ssr: true,
  },
);

function LandingKpiCard({
  label,
  value,
  delta,
  trend,
}: {
  label: string;
  value: string;
  delta: number;
  trend: "up" | "down" | "flat";
}) {
  return (
    <div className="rounded-xl border border-border bg-card/80 px-4 py-4 shadow-card transition hover:border-primary/30 hover:shadow-glow">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold tabular-nums">{value}</p>
      <p
        className={
          trend === "up"
            ? "text-[10px] font-medium text-success"
            : trend === "down"
            ? "text-[10px] font-medium text-destructive"
            : "text-[10px] text-muted-foreground"
        }
      >
        {delta > 0 ? "+" : ""}
        {delta}%
      </p>
    </div>
  );
}

function LandingAiInsightCard({
  title,
  body,
  impact,
}: {
  title: string;
  body: string;
  impact: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card transition hover:border-primary/30 hover:shadow-glow">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">Impact</p>
      <p className="text-sm font-semibold">{impact}</p>
    </div>
  );
}

function LandingChannelTrendChart() {
  const rows = channelMonthly.slice(-4);
  const maxValue = Math.max(...rows.flatMap((row) => [row.swiggy, row.zomato]));

  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-4 shadow-card">
      <div className="flex items-center justify-between gap-4 text-sm font-semibold text-foreground">
        <span>Channel trend</span>
        <span className="text-xs text-muted-foreground">Last 4 months</span>
      </div>
      <div className="mt-4 space-y-4">
        {rows.map((row) => (
          <div key={row.month} className="space-y-2">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
              <span>{row.month}</span>
              <span>₹{row.swiggy + row.zomato}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-chart-3" /> Swiggy
                </span>
                <span>₹{row.swiggy}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-border/30">
                <div
                  className="h-full rounded-full bg-[color:var(--chart-3)]"
                  style={{ width: `${(row.swiggy / maxValue) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-chart-5" /> Zomato
                </span>
                <span>₹{row.zomato}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-border/30">
                <div
                  className="h-full rounded-full bg-[color:var(--chart-5)]"
                  style={{ width: `${(row.zomato / maxValue) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const platformCapabilities = [
  {
    icon: Database,
    title: "Data ingestion",
    body: "POS, aggregators, billing, and inventory sync into one normalized layer.",
  },
  {
    icon: Plug2,
    title: "POS integrations",
    body: "Petpooja, Posist, Razorpay, and custom connectors with hourly reconciliation.",
  },
  {
    icon: Boxes,
    title: "Inventory analytics",
    body: "Stock levels, wastage, par levels, and supplier lead times in one view.",
  },
  {
    icon: Building2,
    title: "Outlet performance",
    body: "Compare any outlet on revenue, margin, labor, and channel mix.",
  },
  {
    icon: Brain,
    title: "AI insights",
    body: "Natural-language answers and anomaly detection on your live data.",
  },
  {
    icon: LineChart,
    title: "Forecasting",
    body: "Demand, revenue, and SKU-level forecasts tuned to your seasonality.",
  },
];

const featureCards = [
  {
    icon: Building2,
    title: "Multi-outlet analytics",
    body: "Roll up or slice any metric across regions, brands, and formats.",
    color: "from-indigo-500 to-cyan-400",
  },
  {
    icon: Boxes,
    title: "Inventory intelligence",
    body: "Par levels, wastage, and procurement signals in one workspace.",
    color: "from-cyan-400 to-emerald-400",
  },
  {
    icon: Brain,
    title: "AI forecasting",
    body: "SKU and outlet forecasts with confidence bands you can trust.",
    color: "from-emerald-400 to-amber-400",
  },
  {
    icon: BarChart3,
    title: "Margin analysis",
    body: "Food cost, discounts, and channel fees reconciled automatically.",
    color: "from-amber-400 to-rose-400",
  },
  {
    icon: Zap,
    title: "Live dashboards",
    body: "Sub-minute refresh on orders, revenue, and operational KPIs.",
    color: "from-rose-500 to-violet-500",
  },
  {
    icon: Users,
    title: "Customer cohorts",
    body: "LTV, retention curves, and segmentation auto-generated.",
    color: "from-violet-500 to-indigo-500",
  },
];

const workflowSteps = [
  {
    step: "1",
    title: "Connect systems",
    body: "Link POS, Swiggy, Zomato, inventory, and payments in minutes.",
  },
  {
    step: "2",
    title: "PulseIQ processes data",
    body: "We normalize, reconcile, and enrich streams into one intelligence layer.",
  },
  {
    step: "3",
    title: "Get actionable intelligence",
    body: "Dashboards, forecasts, and AI answers your team can act on today.",
  },
];

const trustPoints = [
  {
    icon: Shield,
    title: "Enterprise security",
    body: "Encryption, scoped API keys, and audit logs.",
  },
  {
    icon: Activity,
    title: "Scalable infrastructure",
    body: "Built for thousands of outlets with regional data residency.",
  },
  {
    icon: Database,
    title: "Data governance",
    body: "Role-based access, workspace isolation, and export controls.",
  },
  {
    icon: Zap,
    title: "99.9% uptime SLA",
    body: "Production-grade monitoring with enterprise support tiers.",
  },
];

const testimonials = [
  {
    name: "Operations Director",
    role: "Multi-outlet QSR · 12 locations",
    body: "We replaced four spreadsheets with one dashboard. Margin and stock risk are visible before service starts.",
    avatar: "OD",
  },
  {
    name: "Founder",
    role: "Cloud kitchen collective",
    body: "Channel mix updates with every sync. Prep and staffing decisions are data-backed, not gut feel.",
    avatar: "FC",
  },
  {
    name: "General Manager",
    role: "Full-service restaurant group",
    body: "Ask AI in plain English and get charts tied to our order history. Board prep dropped from days to hours.",
    avatar: "GM",
  },
];

const pricingTiers = [
  {
    name: "Starter",
    price: "₹4,999",
    period: "/mo",
    desc: "1–3 outlets, all integrations, 90 day history.",
    features: ["Real-time dashboards", "Basic AI insights", "Email reports", "Email support"],
    cta: "Start free trial",
    highlight: false,
  },
  {
    name: "Growth",
    price: "₹14,999",
    period: "/mo",
    desc: "Up to 15 outlets, advanced AI, full data history.",
    features: [
      "Everything in Starter",
      "Predictive forecasting",
      "Anomaly detection",
      "Ask AI assistant",
      "Priority support",
    ],
    cta: "Start free trial",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "Unlimited outlets, dedicated infra and CSM.",
    features: [
      "Everything in Growth",
      "SSO + role-based access",
      "Custom integrations",
      "Dedicated success manager",
      "99.99% SLA",
    ],
    cta: "Contact sales",
    highlight: false,
  },
];

const aiSampleQuestions = [
  "Why did Friday revenue drop in Bandra?",
  "Forecast next week's biryani demand by outlet.",
  "Which items lost margin this month?",
  "Show repeat customer cohorts for Q2.",
];

function MarketingLandingPage() {
  const weekRevenue = salesTrend.reduce((sum, row) => sum + row.revenue, 0);
  const credibilityBrands = outlets.slice(0, 7).map((o) => o.name);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground antialiased">
      <LandingNavbar />

      {/* Hero */}
      <section id="hero" className="scroll-mt-0 relative overflow-hidden border-b border-border/50 bg-card/20">
        <div className="absolute inset-0 bg-mesh opacity-80" />
        <div className="absolute inset-0 bg-radiant" />
        <div className="absolute inset-0 grid-bg opacity-90" />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 sm:pb-24 sm:pt-16 lg:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-14">
            <div className="min-w-0">
              <Badge
                variant="outline"
                className="mb-6 gap-2 border-primary/30 bg-primary/10 px-3 py-1.5 text-primary"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Conversational AI analytics
              </Badge>
              <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                <span className="block">Your operations.</span>
                <span className="gradient-text">Decoded.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
                PulseIQ unifies POS, Zomato, Swiggy, inventory, and WhatsApp into one intelligence
                platform. See your business clearly. Decide instantly.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-brand text-primary-foreground shadow-glow hover:opacity-90"
                >
                  <Link href="/signup">
                    Start free trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/demo">Explore demo</Link>
                </Button>
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                No credit card · 14-day trial · 5 minute setup
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "7d revenue", value: formatINR(weekRevenue), delta: kpis.revenue },
                  { label: "Orders", value: formatNum(kpis.orders.value), delta: kpis.orders },
                  { label: "Profit", value: formatINR(kpis.profit.value), delta: kpis.profit },
                  {
                    label: "Repeat %",
                    value: `${kpis.repeatCustomers.value}%`,
                    delta: kpis.repeatCustomers,
                  },
                ].map((k) => (
                  <div
                    key={k.label}
                    className="rounded-xl border border-border/60 bg-card/80 px-3 py-2.5 shadow-card backdrop-blur-sm transition hover:border-primary/30 hover:shadow-glow"
                  >
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {k.label}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums">{k.value}</p>
                    <p
                      className={
                        k.delta.trend === "up"
                          ? "text-[10px] font-medium text-success"
                          : k.delta.trend === "down"
                            ? "text-[10px] font-medium text-destructive"
                            : "text-[10px] text-muted-foreground"
                      }
                    >
                      {k.delta.delta > 0 ? "+" : ""}
                      {k.delta.delta}%
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative min-w-0">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-brand opacity-15 blur-2xl" />
              <LandingDashboardPreviewLazy variant="hero" className="relative animate-float" />
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="scroll-mt-0 border-b border-border/50 bg-muted/30 py-8 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Trusted by multi-outlet operators across India and SEA
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            {credibilityBrands.map((name) => (
              <span
                key={name}
                className="text-sm font-semibold text-muted-foreground/80 transition hover:text-foreground"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Platform */}
      <section id="platform" className="scroll-mt-0 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="border-accent/30 bg-accent/10 text-accent">
              Platform
            </Badge>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Every signal. Every outlet.{" "}
              <span className="gradient-text">One operating system.</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Built for operators who treat data as oxygen. PulseIQ replaces fragmented tools and
              spreadsheets.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {platformCapabilities.map((item) => (
              <div
                key={item.title}
                className="group rounded-xl border border-border bg-card p-6 shadow-card transition hover:border-primary/30 hover:shadow-glow"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="scroll-mt-0 border-y border-border/40 bg-muted/20 py-20 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline">Features</Badge>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Intelligence for every team
            </h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((f) => (
              <div
                key={f.title}
                className="group overflow-hidden rounded-xl border border-border bg-card p-6 transition hover:border-primary/30 hover:shadow-glow"
              >
                <div
                  className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${f.color}`}
                >
                  <f.icon className="h-5 w-5 text-primary-foreground" strokeWidth={2.4} />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Analytics / dashboard preview */}
      <section id="analytics" className="scroll-mt-0 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                Live analytics
              </Badge>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Operational dashboards that feel <span className="gradient-text">alive</span>
              </h2>
              <p className="mt-3 text-muted-foreground">
                Preview the same KPIs, charts, and alerts your team sees after connect — powered by
                representative demo data.
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0 self-start lg:self-auto">
              <Link href="/demo">
                Open full demo <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <LandingKpiCard
              label="Revenue"
              value={formatINR(kpis.revenue.value)}
              delta={kpis.revenue.delta}
              trend={kpis.revenue.trend}
            />
            <LandingKpiCard
              label="Profit"
              value={formatINR(kpis.profit.value)}
              delta={kpis.profit.delta}
              trend={kpis.profit.trend}
            />
            <LandingKpiCard
              label="Orders"
              value={formatNum(kpis.orders.value)}
              delta={kpis.orders.delta}
              trend={kpis.orders.trend}
            />
            <LandingKpiCard
              label="Avg order value"
              value={formatINR(kpis.aov.value)}
              delta={Math.abs(kpis.aov.delta)}
              trend={kpis.aov.trend}
            />
          </div>

          <LandingDashboardPreviewLazy variant="full" />
        </div>
      </section>

      {/* Workflow */}
      <section className="scroll-mt-0 border-y border-border/40 bg-card/30 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="gap-1">
              <Workflow className="mr-1 h-3 w-3" />
              How it works
            </Badge>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
              Live in three steps
            </h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {workflowSteps.map((step) => (
              <div
                key={step.step}
                className="relative rounded-xl border border-border bg-card p-6 shadow-card"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-primary-foreground">
                  {step.step}
                </span>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI */}
<section id="ai" className="scroll-mt-20 relative overflow-hidden py-20 sm:py-24">
  <div className="absolute inset-0 bg-mesh opacity-40" />

  <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
    <div className="mx-auto max-w-3xl text-center">
      <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
        <Sparkles className="mr-1 h-3 w-3" />
        AI Business Analyst
      </Badge>

      <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        Ask questions. Get answers like a{" "}
        <span className="gradient-text">restaurant analyst</span>.
      </h2>

      <p className="mt-4 text-muted-foreground">
        PulseIQ connects your sales, channels, outlets, inventory, menu, and customer data —
        then explains what changed, why it changed, and what to do next.
      </p>
    </div>

    <div className="mt-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-3 border-b border-border/60 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>

            <div>
              <p className="text-sm font-semibold">PulseIQ AI</p>
              <p className="text-xs text-muted-foreground">
                AI analyst trained on your restaurant operations
              </p>
            </div>

            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-[10px] font-medium text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Online
            </span>
          </div>

          <div className="mt-5 space-y-4 text-sm">
            <div className="ml-auto max-w-[88%] rounded-2xl bg-primary/15 p-4">
              Why did Bandra West revenue drop on Friday?
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
              <p className="font-semibold">
                Revenue dropped because delivery demand failed during dinner peak.
              </p>

              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Bandra West lost approximately ₹38,400 between 7–9pm after Zomato order
                volume dropped below forecast. Dine-in recovered 41% of the gap, but
                delivery contribution remained weak.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border/60 bg-card p-3">
                  <p className="text-[11px] text-muted-foreground">Revenue impact</p>
                  <p className="mt-1 text-lg font-semibold">₹38.4K</p>
                </div>

                <div className="rounded-xl border border-border/60 bg-card p-3">
                  <p className="text-[11px] text-muted-foreground">Peak window</p>
                  <p className="mt-1 text-lg font-semibold">7–9 PM</p>
                </div>

                <div className="rounded-xl border border-border/60 bg-card p-3">
                  <p className="text-[11px] text-muted-foreground">Recovered</p>
                  <p className="mt-1 text-lg font-semibold">41%</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
              <p className="text-xs font-medium text-muted-foreground">
                Channel performance
              </p>

              <ChartContainer
                className="mt-3 h-[150px] w-full min-w-0"
                config={AI_BAR_CONFIG}
              >
                <BarChart
                  data={channelMonthly.slice(-4)}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--border)"
                    strokeOpacity={0.4}
                  />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                    tickMargin={6}
                  />
                  <YAxis hide width={0} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="swiggy"
                    fill="var(--color-swiggy)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="zomato"
                    fill="var(--color-zomato)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <KpiCard
            label="Revenue protected"
            value="₹1.8L"
            //delta="+12.4%"
            trend="up"
            sub="From AI-detected leakage"
          />

          <KpiCard
            label="Stockout risk"
            value="8 SKUs"
            //delta="-18%"
            trend="down"
            sub="Predicted before service"
          />

          <KpiCard
            label="Margin alerts"
            value="14"
            //delta="+6"
            trend="up"
            sub="Items needing review"
          />

          <KpiCard
            label="Forecast accuracy"
            value="92%"
            //delta="+4.1%"
            trend="up"
            sub="Outlet-level demand forecast"
          />
        </div>

        <div className="grid gap-3">
          {aiInsights.slice(0, 3).map((insight) => (
            <AiInsightCard key={insight.id} {...insight} />
          ))}
        </div>
      </div>
    </div>
  </div>
</section>

      {/* Integrations */}
      <section id="integrations" className="scroll-mt-0 border-y border-border/40 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
              Integrations
            </Badge>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Plug into everything you already use
            </h2>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {integrations.map((int) => (
              <div
                key={int.id}
                className="glass group flex items-center gap-4 rounded-xl px-4 py-4 transition hover:border-primary/30 hover:shadow-card"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${int.color} text-xs font-bold text-white`}
                >
                  {int.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{int.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {int.category} · {int.lastSync}
                  </p>
                </div>
                <span
                  className={
                    int.status === "connected"
                      ? "shrink-0 text-[10px] font-medium text-success"
                      : "shrink-0 text-[10px] text-muted-foreground"
                  }
                >
                  {int.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <LandingTestimonials testimonials={testimonials} />

      {/* Trust */}
      <section id="trust" className="scroll-mt-0 border-y border-border/40 bg-muted/20 py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
          {trustPoints.map((t) => (
            <div key={t.title} className="text-center sm:text-left">
              <t.icon className="mx-auto h-8 w-8 text-primary sm:mx-0" />
              <h3 className="mt-3 font-semibold">{t.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-0 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline">Pricing</Badge>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Simple pricing. Massive ROI.
            </h2>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl border p-6 transition hover:shadow-glow ${
                  tier.highlight
                    ? "border-primary/40 bg-card shadow-glow"
                    : "border-border bg-card/80"
                }`}
              >
                {tier.highlight && (
                  <Badge className="absolute -top-2.5 left-6 border-0 bg-gradient-brand text-primary-foreground">
                    Most popular
                  </Badge>
                )}
                <h3 className="font-semibold">{tier.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold">{tier.price}</span>
                  <span className="text-sm text-muted-foreground">{tier.period}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{tier.desc}</p>
                <Button
                  asChild
                  className={`mt-5 w-full ${tier.highlight ? "bg-gradient-brand text-primary-foreground hover:opacity-90" : ""}`}
                  variant={tier.highlight ? "default" : "outline"}
                >
                  {tier.name === "Enterprise" ? (
                    <a href="mailto:sales@pulseiq.com">{tier.cta}</a>
                  ) : (
                    <Link href="/signup">{tier.cta}</Link>
                  )}
                </Button>
                <ul className="mt-6 space-y-2 text-sm">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="scroll-mt-0 pb-20 sm:pb-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 text-center shadow-glow sm:p-14">
            <div className="absolute inset-0 bg-mesh opacity-60" />
            <div className="relative">
              <Activity className="mx-auto h-10 w-10 text-primary" />
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Run your restaurants on <span className="gradient-text">intelligence.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Go live in 5 minutes. Connect your stack. Watch PulseIQ surface margin you did not
                know you were leaving on the table.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-brand text-primary-foreground shadow-glow hover:opacity-90"
                >
                  <Link href="/signup">
                    Start free trial <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/demo">Explore demo</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

export { MarketingLandingPage };
export default MarketingLandingPage;
