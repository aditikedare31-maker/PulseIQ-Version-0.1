import Link from "next/link";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, showWord = true }: { className?: string; showWord?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 group", className)}>
      <div className="relative h-8 w-8 rounded-lg bg-gradient-brand shadow-glow flex items-center justify-center">
        <Activity className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
        <div className="absolute inset-0 rounded-lg bg-gradient-brand opacity-0 group-hover:opacity-60 blur-lg transition" />
      </div>
      {showWord && (
        <span className="text-[15px] font-semibold tracking-tight">
          Pulse<span className="gradient-text">IQ</span>
        </span>
      )}
    </Link>
  );
}
