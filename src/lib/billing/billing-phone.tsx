import { z } from "zod";

/**
 * Indian mobile number:
 * - 10 digits
 * - Starts with 6, 7, 8, or 9
 * - Excludes landlines
 */
const INDIAN_MOBILE_LOCAL = /^[6-9]\d{9}$/;

/**
 * Parses and normalizes an Indian mobile number to E.164 format.
 *
 * Accepted inputs:
 * - 9876543210
 * - 09876543210
 * - 919876543210
 * - +919876543210
 * - 98765 43210
 * - 98765-43210
 *
 * Output:
 * - +919876543210
 *
 * Returns undefined when input is empty or invalid.
 */
export function parseIndianMobileE164(raw?: string | null): string | undefined {
  if (!raw?.trim()) return undefined;

  const trimmed = raw.trim().replace(/[\s-]/g, "");
  let digits = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+")) {
    if (!digits.startsWith("91")) return undefined;
    digits = digits.slice(2);
  } else if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (!INDIAN_MOBILE_LOCAL.test(digits)) {
    return undefined;
  }

  return `+91${digits}`;
}

export function hasValidIndianMobile(raw?: string | null): boolean {
  return parseIndianMobileE164(raw) !== undefined;
}

/**
 * Required billing/auth phone schema.
 * Accepts local Indian mobile or +91 format.
 * Outputs E.164 format.
 */
export const billingPhoneNumberSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required.")
  .superRefine((value, ctx) => {
    const normalized = parseIndianMobileE164(value);

    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9. Landlines are not supported.",
      });
    }
  })
  .transform((value) => parseIndianMobileE164(value)!);

/**
 * Optional billing/auth phone schema.
 * Empty value is allowed.
 * Valid value is transformed to E.164 format.
 */
export const optionalBillingPhoneNumberSchema = z
  .string()
  .trim()
  .optional()
  .superRefine((value, ctx) => {
    if (!value) return;

    const normalized = parseIndianMobileE164(value);

    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.",
      });
    }
  })
  .transform((value) => {
    if (!value) return undefined;
    return parseIndianMobileE164(value);
  });

/**
 * Razorpay notify_info/customer.contact helper.
 * Razorpay contact should receive normalized phone when available.
 */
export function formatRazorpayNotifyPhone(
  phone?: string | null,
): string | undefined {
  return parseIndianMobileE164(phone);
}

/**
 * Auth/profile storage format.
 *
 * For Indian mobile numbers:
 * - Store as E.164: +91XXXXXXXXXX
 *
 * For future non-Indian support:
 * - Store digits-only fallback, 7–15 digits.
 *
 * Current app primarily validates Indian numbers.
 */
export function normalizePhoneForStorage(raw: string): string {
  const trimmed = raw.trim();
  const e164 = parseIndianMobileE164(trimmed);

  if (e164) return e164;

  return trimmed.replace(/[^0-9]/g, "");
}

/**
 * Generates lookup variants for sign-in and legacy rows.
 *
 * This lets login work even if older rows stored:
 * - 9876543210
 * - 919876543210
 * - +919876543210
 */
export function phoneLookupVariants(raw: string): string[] {
  const normalized = normalizePhoneForStorage(raw);
  const variants = new Set<string>();

  if (normalized) variants.add(normalized);

  const e164 = parseIndianMobileE164(raw);

  if (e164) {
    variants.add(e164);
    variants.add(e164.slice(3)); // 9876543210
    variants.add(e164.slice(1)); // 919876543210
  }

  const digits = raw.replace(/[^0-9]/g, "");

  if (digits) variants.add(digits);

  if (digits.length === 12 && digits.startsWith("91")) {
    variants.add(digits.slice(2)); // 9876543210
    variants.add(`+${digits}`); // +919876543210
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    variants.add(digits.slice(1)); // 9876543210
  }

  return [...variants];
}

export const profilePhoneNumberSchema = billingPhoneNumberSchema;