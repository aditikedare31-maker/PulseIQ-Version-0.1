import { type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/logo";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="grid min-h-dvh bg-background text-foreground lg:grid-cols-2">
      {/* Left marketing panel.
          Hidden on smaller screens because auth pages should stay focused and compact on mobile. */}
      <section className="relative hidden overflow-hidden border-r border-border/60 lg:block">
        <div className="absolute inset-0 bg-mesh" />
        <div className="absolute inset-0 grid-bg" />

        <div className="relative flex h-full flex-col justify-between p-10">
          <Logo />

          <div className="space-y-6">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" />
              Restaurant Intelligence OS
            </div>

            <div className="space-y-4">
              <h2 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight">
                Turn every outlet into a{" "}
                <span className="gradient-text">measurable growth engine.</span>
              </h2>

              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                PulseIQ helps restaurant teams track sales, orders, inventory, menu performance,
                and customer behavior from one clean analytics workspace.
              </p>
            </div>

            <blockquote className="max-w-md rounded-xl border border-border/70 bg-card/80 p-4 text-sm shadow-sm backdrop-blur">
              <p className="leading-6 text-muted-foreground">
                “Spot revenue leaks, slow-moving items, stock risks, and outlet performance issues
                before they become expensive.”
              </p>

              <footer className="mt-3 text-xs text-muted-foreground">
                Built for operators, managers, and growing restaurant brands.
              </footer>
            </blockquote>
          </div>

          <div className="text-xs text-muted-foreground">
            © 2026 PulseIQ Technologies
          </div>
        </div>
      </section>

      {/* Right auth panel */}
      <section className="relative flex min-h-dvh flex-col px-6 py-8 sm:px-10 lg:px-16">
        <header className="flex items-center justify-between">
          <div className="lg:hidden">
            <Logo />
          </div>

          {/* Spacer keeps Back to home aligned right on mobile even when logo is visible. */}
          <div className="hidden lg:block" />

          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to home
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <div className="space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="text-sm leading-6 text-muted-foreground">{subtitle}</p>
            </div>

            <div className="mt-8">{children}</div>

            {footer ? (
              <div className="mt-6 text-center text-xs text-muted-foreground">
                {footer}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}