"use client";

import { useEffect, useState } from "react";
import { Moon, SunMedium, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

const themeIcon = {
  light: SunMedium,
  dark: Moon,
  system: Laptop,
};

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(id);
  }, []);

  // Icon reflects the selected preference (light / dark / system), not the resolved appearance.
  const displayTheme = mounted ? (theme ?? "system") : "system";
  const Icon = themeIcon[displayTheme as keyof typeof themeIcon] ?? Laptop;
  const currentTheme = mounted
    ? theme === "system"
      ? resolvedTheme
      : theme ?? resolvedTheme
    : "system";

  const cycleTheme = () => {
    if (!mounted) return;
    const order = ["light", "dark", "system"] as const;
    const current = (theme ?? "system") as (typeof order)[number];
    const nextIndex = (order.indexOf(current) + 1) % order.length;
    setTheme(order[nextIndex]);
  };

  return (
    <Button
      variant="outline"
      size="icon"
      className="h-8 w-8 border-border/60 bg-card/60 shadow-sm hover:border-primary/30 hover:bg-accent/20"
      aria-label="Toggle theme"
      onClick={cycleTheme}
    >
      <Icon className="h-4 w-4 text-foreground" />
      <span className="sr-only">
        Current theme {mounted ? (currentTheme ?? "system") : "loading"}
      </span>
    </Button>
  );
}
