import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export function LandingFooter() {
  return (
    <footer className="border-t border-border/50 bg-card/30 py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Restaurant and retail intelligence for operators who run on data. Built for
              multi-outlet teams worldwide.
            </p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Product
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="#platform" className="text-muted-foreground transition-colors hover:text-foreground">
                  Platform
                </a>
              </li>
              <li>
                <a href="#features" className="text-muted-foreground transition-colors hover:text-foreground">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-muted-foreground transition-colors hover:text-foreground">
                  Pricing
                </a>
              </li>
              <li>
                <Link href="/signin" className="text-muted-foreground transition-colors hover:text-foreground">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Company
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href="mailto:hello@pulseiq.io"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Contact
                </a>
              </li>
              <li>
                <a href="#trust" className="text-muted-foreground hover:text-foreground">
                  Security
                </a>
              </li>
              <li>
                <span className="text-muted-foreground">Privacy</span>
              </li>
              <li>
                <span className="text-muted-foreground">Terms</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
          <div>© 2026 PulseIQ. All rights reserved.</div>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-3.5 w-3.5" />
            <a href="mailto:hello@pulseiq.io" className="hover:text-foreground">
              hello@pulseiq.io
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
