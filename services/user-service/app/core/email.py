# app/core/email.py
import aiosmtplib
from email.mime.text import MIMEText
from app.core.config import settings

async def send_verification_email(email: str, token: str) -> None:
    verify_link = f"{settings.PUBLIC_BASE_URL}/auth/verify-email?token={token}"
    msg = MIMEText(f"Please verify your email by clicking the link: {verify_link}", "plain")
    msg["Subject"] = "Verify your email"
    msg["From"] = settings.MAIL_FROM
    msg["To"] = email

    await aiosmtplib.send(
        message=msg,
        hostname=settings.MAIL_SERVER,
        port=settings.MAIL_PORT,
        start_tls=getattr(settings, "MAIL_STARTTLS", True),
        use_tls=getattr(settings, "MAIL_SSL_TLS", False),
        username=settings.MAIL_USERNAME if getattr(settings, "USE_CREDENTIALS", True) else None,
        password=settings.MAIL_PASSWORD if getattr(settings, "USE_CREDENTIALS", True) else None,
        timeout=30,
    )
