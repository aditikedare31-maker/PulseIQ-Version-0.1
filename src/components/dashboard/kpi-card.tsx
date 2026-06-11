import { type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  delta?: number;
  trend?: "up" | "down" | "flat";
  icon?: ReactNode;
  sub?: string;
  accent?: "primary" | "accent" | "success" | "warning" | "rose";
}

const accentMap = {
  primary: "bg-primary/10 text-primary border-primary/20",
  accent: "bg-accent/10 text-accent border-accent/20",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  rose: "bg-destructive/10 text-destructive border-destructive/20",
};

const glowMap = {
  primary: "bg-primary",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  rose: "bg-destructive",
};

export function KpiCard({
  label,
  value,
  delta,
  trend = "flat",
  icon,
  sub,
  accent = "primary",
}: KpiCardProps) {
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
  const trendClr =
    trend === "up"
      ? "text-success"
      : trend === "down"
        ? "text-destructive"
        : "text-muted-foreground";
  return (
    <div className="group relative w-full overflow-hidden min-w-0 rounded-2xl border border-border/70 bg-card p-5 shadow-card ring-1 ring-primary/5 transition hover:border-primary/30 hover:shadow-glow">
      <div
        className={cn(
          "absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-50 blur-2xl transition group-hover:opacity-80",
          glowMap[accent],
        )}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
        </div>
        {icon && (
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg border",
              accentMap[accent],
            )}
          >
            {icon}
          </div>
        )}
      </div>
      <div className="relative mt-3 flex items-center gap-2 text-xs">
        {delta !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md bg-card-subtle px-1.5 py-0.5 font-medium",
              trendClr,
            )}
          >
            <TrendIcon className="h-3 w-3" />
            {Math.abs(delta)}%
          </span>
        )}
        <span className="text-muted-foreground">{sub ?? "vs last period"}</span>
      </div>
    </div>
  );
}
