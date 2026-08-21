"""Outgoing email via Resend.

When ``RESEND_API_KEY`` is not configured the message is logged instead of sent, so the
verification flow works end to end in local development without an email provider.
"""

import logging

import httpx

from .config import settings

logger = logging.getLogger("palette.email")

RESEND_ENDPOINT = "https://api.resend.com/emails"


def build_verification_link(token: str) -> str:
    """Link the user clicks in the email — points at the frontend verify page.

    Extensionless: the React route is `/verify` (frontend-react/src/App.tsx). Keep it in
    sync with tests/test_email_links.py.
    """
    return f"{settings.public_base_url}/verify?token={token}"


def send_email(to: str, subject: str, html: str) -> None:
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY is not set; email to %s not sent. Subject: %s", to, subject)
        logger.info("Email body (dev fallback):\n%s", html)
        return

    try:
        response = httpx.post(
            RESEND_ENDPOINT,
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={"from": settings.email_from, "to": [to], "subject": subject, "html": html},
            timeout=10.0,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        # Do not fail the request if email delivery fails; the user can resend later.
        logger.error("Failed to send email to %s: %s", to, exc)


def build_reset_link(token: str) -> str:
    """Link the user clicks in the email — points at the frontend reset-password page.

    Extensionless: the React route is `/reset-password` (frontend-react/src/App.tsx).
    """
    return f"{settings.public_base_url}/reset-password?token={token}"


def send_password_reset_email(to: str, username: str, token: str) -> None:
    link = build_reset_link(token)
    subject = "Reset your Palette password"
    html = f"""
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Reset your Palette password</h2>
      <p>Hi {username}, we received a request to reset your password.</p>
      <p>
        <a href="{link}"
           style="display: inline-block; padding: 12px 20px; background: #406eb7;
                  color: #fff; text-decoration: none; border-radius: 8px;">
          Choose a new password
        </a>
      </p>
      <p style="color: #666; font-size: 13px;">
        Or paste this link into your browser:<br>{link}
      </p>
      <p style="color: #999; font-size: 12px;">
        If you did not request a password reset, you can ignore this email; your password
        will not change.
      </p>
    </div>
    """
    send_email(to, subject, html)


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


def send_duplicate_registration_email(to: str, username: str) -> None:
    """Tell the owner that their address was used in a registration attempt.

    This is what lets /register answer the same way for a known and an unknown address without
    stranding anyone: the person who genuinely forgot they had signed up is told, in the one
    channel that proves they own the address, that the account exists and how to get back into
    it. Somebody probing the endpoint learns nothing, because the reply they see is identical
    either way and the explanation goes to the address, not to them.
    """
    link = f"{settings.public_base_url}/forgot-password"
    subject = "You already have a Palette account"
    html = f"""
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>You already have an account</h2>
      <p>
        Hi {username}, someone just tried to sign up for Palette with this email address.
        An account already exists for it, so nothing was created and nothing has changed.
      </p>
      <p>If that was you and you cannot get in, reset your password:</p>
      <p>
        <a href="{link}"
           style="display: inline-block; padding: 12px 20px; background: #406eb7;
                  color: #fff; text-decoration: none; border-radius: 8px;">
          Reset your password
        </a>
      </p>
      <p style="color: #999; font-size: 12px;">
        If it was not you, you can ignore this email — your account is untouched.
      </p>
    </div>
    """
    send_email(to, subject, html)
