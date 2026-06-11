"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

/**
 * Lazy-loaded dashboard preview component.
 * Heavy Recharts rendering is deferred until this component is visible/needed.
 */
const DashboardPreviewContent = dynamic(
  () => import("./landing-dashboard-preview").then(mod => ({ default: mod.LandingDashboardPreview })),
  {
    loading: () => (
      <div
        className={cn(
          "min-w-0 overflow-hidden",
          "relative overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-card ring-1 ring-primary/5",
          "min-h-[320px] sm:min-h-[360px]"
        )}
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-brand opacity-20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-32 animate-pulse rounded bg-muted/50 mx-auto" />
            <div className="mt-4 space-y-2">
              <div className="h-4 w-48 animate-pulse rounded bg-muted/50 mx-auto" />
              <div className="h-4 w-40 animate-pulse rounded bg-muted/50 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    ),
    ssr: false, // Only render on client to avoid bundle bloat
  }
);

interface LandingDashboardPreviewLazyProps {
  variant?: "hero" | "full";
  className?: string;
}

export function LandingDashboardPreviewLazy({
  variant = "hero",
  className,
}: LandingDashboardPreviewLazyProps) {
  return <DashboardPreviewContent variant={variant} className={className} />;
}
