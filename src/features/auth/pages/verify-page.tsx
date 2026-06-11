"use client";

import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { type FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/use-auth";
import { toast } from "sonner";

export default function VerifyPage() {
  const router = useRouter();
  const [contact, setContact] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("verificationContact") ?? "";
    }
    return "";
  });
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const { isAuthenticated, loading, refresh } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (!resendCountdown) {
      return;
    }

    const interval = window.setInterval(() => {
      setResendCountdown((value) => Math.max(value - 1, 0));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [resendCountdown]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedContact = contact.trim();
    const normalizedCode = code.trim();

    if (!normalizedContact || !normalizedCode) {
      toast.error("Contact and code are required.");
      return;
    }

    if (!/^\d{6}$/.test(normalizedCode)) {
      toast.error("OTP code must be exactly 6 digits.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: normalizedContact,
          code: normalizedCode,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(result?.message ?? "Verification failed. Please check your code.");
        return;
      }

      toast.success(result?.message ?? "Verified successfully.");
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("verificationContact");
      }
      const user = await refresh();
      if (user) {
        router.replace("/dashboard");
      } else {
        toast.error("Verification successful but failed to load session. Please sign in.");
        router.replace("/signin");
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Unable to verify code. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    const normalizedContact = contact.trim();

    if (!normalizedContact) {
      toast.error("Enter your email or phone to resend the code.");
      return;
    }

    if (resendCountdown > 0) {
      return;
    }

    setIsResending(true);

    try {
      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: normalizedContact }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(result?.message ?? "Unable to resend verification code.");
        return;
      }

      setResendCountdown(result?.cooldownSeconds ?? 30);
      toast.success(result?.message ?? "Verification code resent.");
    } catch (error) {
      console.error("Resend verification error:", error);
      toast.error("Unable to resend code. Please try again later.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthShell
      title="Verify your account"
      subtitle={`Enter the 6-digit code sent to ${contact || "your email or phone"}.`}
      footer={
        <>
          Didn&apos;t get it?{" "}
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={handleResend}
            disabled={isResending || resendCountdown > 0}
          >
            {isResending
              ? "Resending…"
              : resendCountdown > 0
                ? `Resend available in ${resendCountdown}s`
                : "Resend"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1.5">
          <label htmlFor="verify-contact" className="text-xs text-muted-foreground">
            Email or phone
          </label>
          <Input
            id="verify-contact"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            placeholder="you@restaurant.com or +919876543210"
            disabled={isSubmitting || isResending}
            autoComplete="username"
          />
        </div>
        <div className="flex justify-center">
          <InputOTP maxLength={6} value={code} onChange={setCode} disabled={isSubmitting}>
            <InputOTPGroup>
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button
          type="submit"
          disabled={isSubmitting || !/^\d{6}$/.test(code)}
          className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90"
        >
          {isSubmitting ? "Verifying…" : "Verify and continue"}
        </Button>
      </form>
    </AuthShell>
  );
}
