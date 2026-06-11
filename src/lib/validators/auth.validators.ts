/**
 * Zod validation schemas for all auth endpoints.
 * Provides strong input validation and prevents invalid auth payloads.
 */
import { z } from "zod";
import {
  billingPhoneNumberSchema,
  parseIndianMobileE164,
} from "@/lib/billing/billing-phone";

// ─── Reusable field schemas ──────────────────────────────────────────────────

/** Accepts a valid email OR a formatted phone number, then normalizes phone input */
const contactSchema = z
  .string({ message: "Contact (email or phone) is required." })
  .trim()
  .min(1, "Contact cannot be empty.")
  .refine(
    (val) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\+?[\d\s\-().]{7,20}$/;

      return emailRegex.test(val.toLowerCase()) || phoneRegex.test(val);
    },
    { message: "Enter a valid email address or phone number." },
  )
  .transform((val) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmed = val.trim();

    if (emailRegex.test(trimmed.toLowerCase())) {
      return trimmed.toLowerCase();
    }

    return parseIndianMobileE164(trimmed) ?? trimmed.replace(/[^\d+]/g, "");
  });

const passwordSchema = z
  .string({ message: "Password is required." })
  .min(8, "Password must be at least 8 characters long.")
  .max(128, "Password must not exceed 128 characters.");

const otpCodeSchema = z
  .string({ message: "OTP code is required." })
  .regex(/^\d{6}$/, "OTP code must be exactly 6 digits.");

// ─── Route-specific schemas ──────────────────────────────────────────────────

export const signUpSchema = z.object({
  firstName: z
    .string({ message: "First name is required." })
    .trim()
    .min(1, "First name cannot be empty.")
    .max(50, "First name must not exceed 50 characters.")
    .regex(/^[a-zA-Z\s'-]+$/, "First name contains invalid characters."),

  lastName: z
    .string({ message: "Last name is required." })
    .trim()
    .min(1, "Last name cannot be empty.")
    .max(50, "Last name must not exceed 50 characters.")
    .regex(/^[a-zA-Z\s'-]+$/, "Last name contains invalid characters."),

  company: z
    .string({ message: "Company name is required." })
    .trim()
    .min(1, "Company name cannot be empty.")
    .max(100, "Company name must not exceed 100 characters.")
    .transform((val) => val.toUpperCase()),

  email: z
    .string({ message: "Email is required." })
    .trim()
    .toLowerCase()
    .email("Enter a valid email address."),

  phone: billingPhoneNumberSchema,

  password: passwordSchema,
});

export const signInSchema = z.object({
  contact: contactSchema,
  password: z
    .string({ message: "Password is required." })
    .min(1, "Password cannot be empty.")
    .max(128, "Password must not exceed 128 characters."),
});

export const verifyOtpSchema = z.object({
  contact: contactSchema,
  code: otpCodeSchema,
});

export const resendOtpSchema = z.object({
  contact: contactSchema,
});

// ─── Type exports ────────────────────────────────────────────────────────────

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;