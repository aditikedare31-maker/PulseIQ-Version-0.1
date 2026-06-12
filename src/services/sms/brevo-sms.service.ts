import "server-only";

import { logger } from "@/lib/logger";
import { SMS_DEV_MODE } from "@/app/config/env.server";

export interface SendSmsOtpOptions {
  phone: string;
  otp: string;
}

export function normalizePhoneForSms(phone: string): string {
  const normalized = phone.trim();
  if (normalized.startsWith("+")) {
    return normalized;
  }
  return normalized;
}

export async function sendSmsOtp({ phone, otp }: SendSmsOtpOptions): Promise<boolean> {
  if (!phone) {
    logger.error("sms", "missing_phone", { reason: "phone_required" });
    return false;
  }

  const normalizedPhone = normalizePhoneForSms(phone);
  if (!/^[+][0-9]{7,15}$/.test(normalizedPhone)) {
    logger.error("sms", "invalid_phone_format", {
      phone: normalizedPhone,
      reason: "invalid_e164",
    });
    return false;
  }

  const brevoApiKey = process.env.BREVO_API_KEY || process.env.API_KEY;
  const smsDevMode = process.env.SMS_DEV_MODE === "true";

  if (smsDevMode || !brevoApiKey) {
    logger.info("sms", "sms_dev_mode", { phone: normalizedPhone });
    return false;
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/transactionalSMS/send", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": brevoApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: process.env.BREVO_SMS_SENDER || "PulseIQ",
        recipient: normalizedPhone,
        content: `Your PulseIQ phone verification code is ${otp}. It expires in 5 minutes.`,
        type: "transactional",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("sms", "brevo_send_failed", {
        phone: normalizedPhone,
        status: response.status,
        error: errorText,
      });
      return false;
    }

    logger.info("sms", "brevo_send_success", {
      phoneSuffix: normalizedPhone.slice(-4),
      sender: process.env.BREVO_SMS_SENDER,
    });
    return true;
  } catch (error) {
    logger.error("sms", "brevo_request_error", {
      phoneSuffix: normalizedPhone.slice(-4),
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
