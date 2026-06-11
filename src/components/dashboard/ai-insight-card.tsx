import { Sparkles, AlertTriangle, TrendingUp, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AiInsightCardProps {
  type: "opportunity" | "alert" | "forecast";
  title: string;
  body: string;
  impact: string;
  confidence: number;
}

const meta = {
  opportunity: {
    icon: Target,
    label: "Opportunity",
    clr: "text-success",
    ring: "ring-success/20",
    bg: "bg-success/10",
  },
  alert: {
    icon: AlertTriangle,
    label: "Anomaly",
    clr: "text-destructive",
    ring: "ring-destructive/20",
    bg: "bg-destructive/10",
  },
  forecast: {
    icon: TrendingUp,
    label: "Forecast",
    clr: "text-accent",
    ring: "ring-accent/20",
    bg: "bg-accent/10",
  },
};

export function AiInsightCard({ type, title, body, impact, confidence }: AiInsightCardProps) {
  const m = meta[type];
  const Icon = m.icon;
  return (
    <div className="group relative w-full overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition hover:border-primary/30">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-brand opacity-10 blur-3xl transition group-hover:opacity-20" />
      <div className="relative flex items-start gap-4">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1",
            m.bg,
            m.ring,
          )}
        >
          <Icon className={cn("h-5 w-5", m.clr)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("text-[10px] font-semibold uppercase tracking-wider", m.clr)}>
              {m.label}
            </span>
            <span className="text-[10px] text-muted-foreground">· {confidence}% confidence</span>
          </div>
          <h4 className="mt-1 text-sm font-semibold leading-snug">{title}</h4>
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{body}</p>
          <div className="mt-3 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 rounded-md bg-card-subtle px-2 py-1 text-xs">
              <Sparkles className="h-3 w-3 text-accent" />
              <span className="font-medium">{impact}</span>
            </div>
            <Button size="sm" variant="ghost" className="h-7 text-xs">
              Apply →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
