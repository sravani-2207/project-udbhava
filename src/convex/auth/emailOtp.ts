import { Email } from "@convex-dev/auth/providers/Email";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";

export const emailOtp = Email({
  id: "email-otp",
  maxAge: 60 * 15,

  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes: Uint8Array) {
        crypto.getRandomValues(bytes);
      },
    };

    return generateRandomString(
      random,
      "0123456789",
      6
    );
  },

  async sendVerificationRequest({ identifier: email, token }) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;

    if (!apiKey || !from) {
      throw new Error(
        "Resend configuration is missing."
      );
    }

    const response = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: "Your Udbhava verification code",
          html: `
            <div style="font-family:Arial,sans-serif;padding:24px">
              <h2>Welcome to Udbhava!</h2>
              <p>Your verification code is:</p>
              <h1 style="letter-spacing:8px">${token}</h1>
              <p>This code expires in 15 minutes.</p>
              <p>If you didn't request this code, ignore this email.</p>
            </div>
          `,
          text: `Your Udbhava verification code is ${token}. It expires in 15 minutes.`,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("Resend email error:", response.status, error);

      throw new Error(
        `Could not send verification email (HTTP ${response.status}).`
      );
    }
  },
});