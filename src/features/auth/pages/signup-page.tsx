"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { type FormEvent, useState } from "react";
import { hasValidIndianMobile } from "@/lib/billing/billing-phone";

export default function SignUpPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const phoneInvalid = phoneTouched && phone.length > 0 && !hasValidIndianMobile(phone);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPhoneTouched(true);

    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedCompany = company.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.replace(/\D/g, "").slice(0, 10);

    if (
      !normalizedFirstName ||
      !normalizedLastName ||
      !normalizedCompany ||
      !normalizedEmail ||
      !normalizedPhone ||
      !password
    ) {
      toast.error("All fields are required.");
      return;
    }

    if (!hasValidIndianMobile(normalizedPhone)) {
      toast.error("Enter a valid 10-digit Indian mobile number (starts with 6–9).");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);

    if (process.env.NODE_ENV === "development") {
      console.log("SIGNUP SUBMIT:", {
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        company: normalizedCompany,
        email: normalizedEmail,
        phone: normalizedPhone,
      });
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          company: normalizedCompany,
          email: normalizedEmail,
          phone: normalizedPhone,
          password,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(result?.message ?? "Signup failed. Please try again.");
        return;
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem("verificationContact", result.contact ?? normalizedEmail);
        sessionStorage.setItem("verificationEmail", normalizedEmail);
        sessionStorage.setItem("verificationPhone", normalizedPhone);
      }

      toast.success(result?.message ?? "Please verify your email and phone.");
      router.push("/verify-account");
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("Unable to create account. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create your workspace"
      subtitle="Start your 14-day trial. No credit card required."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/signin" className="text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName" className="text-xs">
              First name
            </Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="Aarav"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName" className="text-xs">
              Last name
            </Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Reddy"
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs">
            Work email
          </Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@restaurant.com"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs">
            Mobile number
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">+91</span>
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              placeholder="9619286140"
              aria-invalid={phoneInvalid}
              value={phone}
              onBlur={() => setPhoneTouched(true)}
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
              required
            />
          </div>
          {phoneInvalid ? (
            <p className="text-xs text-destructive">
              Enter a valid 10-digit Indian mobile (starts with 6–9). Required for Razorpay billing.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Saved securely as +91 for login, profile, and Razorpay checkout.
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company" className="text-xs">
            Company
          </Label>
          <Input
            id="company"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            placeholder="Spice Route Co."
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            required
            minLength={8}
          />
        </div>
        <Button
          type="submit"
          disabled={isSubmitting || (phone.length > 0 && !hasValidIndianMobile(phone))}
          className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90"
        >
          {isSubmitting ? "Creating workspace..." : "Create workspace"}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          By continuing you agree to our Terms and Privacy Policy.
        </p>
      </form>
    </AuthShell>
  );
}
