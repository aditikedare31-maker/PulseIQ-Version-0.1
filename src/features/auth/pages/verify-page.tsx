"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/features/auth/use-auth";
import { toast } from "sonner";
import { Mail, Smartphone, CheckCircle2, ShieldCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmail(value: string) {
  return EMAIL_REGEX.test(value.trim().toLowerCase());
}

export default function VerifyPage() {
  const router = useRouter();
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [phoneVerified, setPhoneVerified] = useState<boolean | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [isSubmittingPhone, setIsSubmittingPhone] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [isResendingPhone, setIsResendingPhone] = useState(false);
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [phoneCountdown, setPhoneCountdown] = useState(0);

  const { isAuthenticated, loading, refresh } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedVerificationContact = sessionStorage.getItem("verificationContact") ?? "";
    const storedVerificationEmail = sessionStorage.getItem("verificationEmail") ?? "";
    const storedVerificationPhone = sessionStorage.getItem("verificationPhone") ?? "";

    setContact(storedVerificationContact);
    setEmail(storedVerificationEmail);
    setPhone(storedVerificationPhone);
  }, []);

  const effectiveEmail = useMemo(() => {
    if (email) return email;
    if (isEmail(contact)) return contact.trim().toLowerCase();
    return "";
  }, [contact, email]);

  const effectivePhone = useMemo(() => {
    if (phone) return phone;
    if (!isEmail(contact)) return contact.replace(/\D/g, "");
    return "";
  }, [contact, phone]);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [loading, isAuthenticated, router]);

  // Phase 1: Redirect to dashboard when at least one verification method is complete
  useEffect(() => {
    const hasMinimumVerification = emailVerified || phoneVerified;
    if (hasMinimumVerification) {
      // Don't auto-redirect immediately - let user see the success message and click continue
      // The user can click "Continue to dashboard" button to proceed
    }
  }, [emailVerified, phoneVerified, router]);

  useEffect(() => {
    if (!emailCountdown && !phoneCountdown) {
      return;
    }

    const interval = window.setInterval(() => {
      setEmailCountdown((value) => Math.max(value - 1, 0));
      setPhoneCountdown((value) => Math.max(value - 1, 0));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [emailCountdown, phoneCountdown]);

  useEffect(() => {
    if (!contact) {
      return;
    }

    async function loadStatus() {
      setIsLoadingStatus(true);
      try {
        const response = await fetch(`/api/auth/verification-status?contact=${encodeURIComponent(contact)}`);
        if (!response.ok) {
          const result = await response.json().catch(() => null);
          setMaskedEmail("");
          setMaskedPhone("");
          setEmailVerified(null);
          setPhoneVerified(null);
          if (result?.message) {
            toast.error(result.message);
          }
          return;
        }

        const result = await response.json();
        setMaskedEmail(result.email ?? "");
        setMaskedPhone(result.phone ?? "");
        setEmailVerified(result.emailVerified ?? false);
        setPhoneVerified(result.phoneVerified ?? false);
      } catch (error) {
        console.error("Unable to load verification status:", error);
        toast.error("Unable to load verification status. Please refresh.");
      } finally {
        setIsLoadingStatus(false);
      }
    }

    loadStatus();
  }, [contact]);

  async function handleVerifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!effectiveEmail) {
      toast.error("Email is required for email verification.");
      return;
    }

    if (!/^\d{6}$/.test(emailCode)) {
      toast.error("Enter the 6-digit email OTP.");
      return;
    }

    setIsSubmittingEmail(true);

    try {
      const response = await fetch("/api/auth/verify-email-otp", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: effectiveEmail, code: emailCode }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(result?.message ?? "Email verification failed.");
        return;
      }

      setEmailVerified(true);
      setPhoneVerified(result.phoneVerified ?? phoneVerified ?? false);
      toast.success(result.message ?? "Email verified.");

      // Phase 1: Redirect to dashboard when minimum verification is met (at least one method verified)
      if (result.isVerified) {
        const user = await refresh();
        if (user) {
          router.replace("/dashboard");
        }
      }
    } catch (error) {
      console.error("Email verification error:", error);
      toast.error("Unable to verify email code. Please try again later.");
    } finally {
      setIsSubmittingEmail(false);
    }
  }

  async function handleVerifyPhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!effectivePhone) {
      toast.error("Phone is required for phone verification.");
      return;
    }

    if (!/^\d{6}$/.test(phoneCode)) {
      toast.error("Enter the 6-digit phone OTP.");
      return;
    }

    setIsSubmittingPhone(true);

    try {
      const response = await fetch("/api/auth/verify-phone-otp", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: effectivePhone, code: phoneCode }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(result?.message ?? "Phone verification failed.");
        return;
      }

      setPhoneVerified(true);
      setEmailVerified(result.emailVerified ?? emailVerified ?? false);
      toast.success(result.message ?? "Phone verified.");

      // Phase 1: Redirect to dashboard when minimum verification is met (at least one method verified)
      if (result.isVerified) {
        const user = await refresh();
        if (user) {
          router.replace("/dashboard");
        }
      }
    } catch (error) {
      console.error("Phone verification error:", error);
      toast.error("Unable to verify phone code. Please try again later.");
    } finally {
      setIsSubmittingPhone(false);
    }
  }

  async function handleResendEmail() {
    if (!effectiveEmail) {
      toast.error("Email is required to resend the email OTP.");
      return;
    }

    if (emailCountdown > 0) {
      return;
    }

    setIsResendingEmail(true);

    try {
      const response = await fetch("/api/auth/send-email-otp", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: effectiveEmail }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(result?.message ?? "Unable to resend email OTP.");
        return;
      }

      setEmailCountdown(result?.cooldownSeconds ?? 30);
      toast.success(result?.message ?? "Email OTP resent.");
    } catch (error) {
      console.error("Email resend error:", error);
      toast.error("Unable to resend email OTP. Please try again later.");
    } finally {
      setIsResendingEmail(false);
    }
  }

  async function handleResendPhone() {
    if (!effectivePhone) {
      toast.error("Phone is required to resend the phone OTP.");
      return;
    }

    if (phoneCountdown > 0) {
      return;
    }

    setIsResendingPhone(true);

    try {
      const response = await fetch("/api/auth/send-phone-otp", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: effectivePhone }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(result?.message ?? "Unable to resend phone OTP.");
        return;
      }

      setPhoneCountdown(result?.cooldownSeconds ?? 30);
      toast.success(result?.message ?? "Phone OTP resent.");
    } catch (error) {
      console.error("Phone resend error:", error);
      toast.error("Unable to resend phone OTP. Please try again later.");
    } finally {
      setIsResendingPhone(false);
    }
  }

  const completedCount = (emailVerified ? 1 : 0) + (phoneVerified ? 1 : 0);
  const totalSteps = 2;
  const hasMinimumVerification = emailVerified || phoneVerified;
  const fullyVerified = emailVerified && phoneVerified;

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Verify your account</h1>
          <p className="text-sm text-muted-foreground">
            Verify at least one method to continue. You can add the second verification method later from Settings.
          </p>
        </div>

        {/* Progress Summary Card */}
        {!isLoadingStatus && (
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-xs font-semibold text-primary">
                    {completedCount}/{totalSteps}
                  </span>
                </div>
                <span className="text-sm font-medium">Verification progress</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  {emailVerified ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={emailVerified ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                    Email
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {phoneVerified ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={phoneVerified ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                    Phone
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact Input */}
        <div className="space-y-1.5">
          <label htmlFor="verify-contact" className="text-xs text-muted-foreground">
            Verification contact
          </label>
          <Input
            id="verify-contact"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            placeholder="you@restaurant.com or +919876543210"
            disabled={isLoadingStatus}
            autoComplete="username"
          />
        </div>

        {isLoadingStatus ? (
          <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground shadow-sm">
            Loading verification status…
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Email Verification Card */}
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    emailVerified ? "bg-emerald-100" : "bg-primary/10"
                  }`}>
                    {emailVerified ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <Mail className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Email verification</p>
                    <p className="text-xs text-muted-foreground">
                      {maskedEmail || "Email address not available."}
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  emailVerified ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                }`}>
                  {emailVerified ? "Verified" : "Pending"}
                </span>
              </div>

              {!emailVerified && (
                <form onSubmit={handleVerifyEmail} className="space-y-4">
                  <div className="flex justify-center">
                    <InputOTP value={emailCode} onChange={setEmailCode} maxLength={6} disabled={isSubmittingEmail}>
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button
                      type="submit"
                      disabled={isSubmittingEmail || !/^\d{6}$/.test(emailCode)}
                      className="w-full"
                    >
                      {isSubmittingEmail ? "Verifying…" : "Verify email"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleResendEmail}
                      disabled={isResendingEmail || emailCountdown > 0}
                      className="w-full text-sm"
                    >
                      {isResendingEmail
                        ? "Resending…"
                        : emailCountdown > 0
                          ? `Resend in ${emailCountdown}s`
                          : "Resend email OTP"}
                    </Button>
                  </div>
                </form>
              )}

              {emailVerified && (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Email verified successfully</span>
                </div>
              )}
            </div>

            {/* Phone Verification Card */}
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    phoneVerified ? "bg-emerald-100" : "bg-primary/10"
                  }`}>
                    {phoneVerified ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <Smartphone className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Phone verification</p>
                    <p className="text-xs text-muted-foreground">
                      {maskedPhone || "Phone number not available."}
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  phoneVerified ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                }`}>
                  {phoneVerified ? "Verified" : "Pending"}
                </span>
              </div>

              {!phoneVerified && (
                <form onSubmit={handleVerifyPhone} className="space-y-4">
                  <div className="flex justify-center">
                    <InputOTP value={phoneCode} onChange={setPhoneCode} maxLength={6} disabled={isSubmittingPhone}>
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button
                      type="submit"
                      disabled={isSubmittingPhone || !/^\d{6}$/.test(phoneCode)}
                      className="w-full"
                    >
                      {isSubmittingPhone ? "Verifying…" : "Verify phone"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleResendPhone}
                      disabled={isResendingPhone || phoneCountdown > 0}
                      className="w-full text-sm"
                    >
                      {isResendingPhone
                        ? "Resending…"
                        : phoneCountdown > 0
                          ? `Resend in ${phoneCountdown}s`
                          : "Resend phone OTP"}
                    </Button>
                  </div>
                </form>
              )}

              {phoneVerified && (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Phone verified successfully</span>
                </div>
              )}
            </div>

            {/* Continue to Dashboard Button - shown when at least one method is verified */}
            {hasMinimumVerification && (
              <div className="rounded-2xl border bg-emerald-50 p-6 shadow-sm">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">
                      {fullyVerified ? "Account verified" : "Verification complete"}
                    </p>
                    <p className="text-xs text-emerald-700 mt-1">
                      {emailVerified && !phoneVerified && "Email verified. You can verify your phone later from Settings."}
                      {phoneVerified && !emailVerified && "Phone verified. You can verify your email later from Settings."}
                      {fullyVerified && "Your account is fully verified."}
                    </p>
                  </div>
                  <Button
                    onClick={() => router.push("/dashboard")}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    Continue to dashboard
                  </Button>
                  {/* TODO: In Settings, add a security section where users can complete the second verification method. */}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Back to Sign In */}
        <div className="flex justify-center pt-2">
          <Link
            href="/signin"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
