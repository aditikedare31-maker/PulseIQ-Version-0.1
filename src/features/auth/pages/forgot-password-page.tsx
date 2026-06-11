"use client";

import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Password reset is coming soon. Contact your workspace administrator if you need help signing in."
      footer={
        <Link href="/signin" className="text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <Button
        className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90"
        onClick={() => toast.info("Password reset coming soon")}
      >
        Password reset coming soon
      </Button>
    </AuthShell>
  );
}
