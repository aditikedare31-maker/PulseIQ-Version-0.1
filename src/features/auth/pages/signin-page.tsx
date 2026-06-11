"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { type FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/use-auth";

export default function SignInPage() {
  const router = useRouter();
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isAuthenticated, loading, refresh } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [loading, isAuthenticated, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedContact = contact.trim();

    if (!normalizedContact || !password) {
      toast.error("Email or phone and password are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: normalizedContact,
          password,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 403) {
          sessionStorage.setItem("verificationContact", normalizedContact);
          router.push("/verify");
          toast.error(result?.message ?? "Please verify your account before signing in.");
          return;
        }

        toast.error(result?.message ?? "Sign in failed. Please check your credentials.");
        return;
      }

      toast.success(result?.message ?? "Signed in successfully.");

      const user = await refresh();

      if (user) {
        router.replace("/dashboard");
        return;
      }

      toast.error("Failed to load user data. Please try signing in again.");
    } catch (error) {
      console.error("Sign in error:", error);
      toast.error("Unable to sign in. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your PulseIQ workspace."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" className="h-10" disabled>
            Google
          </Button>
          <Button type="button" variant="outline" className="h-10" disabled>
            Microsoft
          </Button>
        </div>
        <div className="relative my-4">
          <Separator />
          <span className="absolute inset-0 -top-2 mx-auto w-fit bg-background px-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            or with email or phone
          </span>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact" className="text-xs">
            Email or phone
          </Label>
          <Input
            id="contact"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            placeholder="you@restaurant.com or +919876543210"
            disabled={isSubmitting}
            autoComplete="username"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs">
              Password
            </Label>
            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            disabled={isSubmitting}
            autoComplete="current-password"
          />
        </div>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
