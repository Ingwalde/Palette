"""Outgoing email via Resend.

When ``RESEND_API_KEY`` is not configured the message is logged instead of sent, so the
verification flow works end to end in local development without an email provider.
"""
import logging

import httpx

from .config import EMAIL_FROM, PUBLIC_BASE_URL, RESEND_API_KEY

logger = logging.getLogger("palette.email")

RESEND_ENDPOINT = "https://api.resend.com/emails"


def build_verification_link(token: str) -> str:
    """Link the user clicks in the email — points at the frontend verify page."""
    return f"{PUBLIC_BASE_URL}/verify.html?token={token}"


def send_email(to: str, subject: str, html: str) -> None:
    if not RESEND_API_KEY:
        logger.warning(
            "RESEND_API_KEY is not set; email to %s not sent. Subject: %s", to, subject
        )
        logger.info("Email body (dev fallback):\n%s", html)
        return

    try:
        response = httpx.post(
            RESEND_ENDPOINT,
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            json={"from": EMAIL_FROM, "to": [to], "subject": subject, "html": html},
            timeout=10.0,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        # Do not fail the request if email delivery fails; the user can resend later.
        logger.error("Failed to send email to %s: %s", to, exc)


def send_verification_email(to: str, username: str, token: str) -> None:
    link = build_verification_link(token)
    subject = "Verify your Palette email"
    html = f"""
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Welcome to Palette, {username}!</h2>
      <p>Confirm your email address to finish setting up your account.</p>
      <p>
        <a href="{link}"
           style="display: inline-block; padding: 12px 20px; background: #406eb7;
                  color: #fff; text-decoration: none; border-radius: 8px;">
          Verify email
        </a>
      </p>
      <p style="color: #666; font-size: 13px;">
        Or paste this link into your browser:<br>{link}
      </p>
      <p style="color: #999; font-size: 12px;">
        If you did not create a Palette account, you can ignore this email.
      </p>
    </div>
    """
    send_email(to, subject, html)
