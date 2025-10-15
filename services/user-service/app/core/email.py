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
        message = msg,
        hostname = "smtp.gmail.com",
        port = 465,
        start_tls = False,
        use_tls = True,
        username = settings.MAIL_USERNAME,
        password = settings.MAIL_PASSWORD,
        timeout = 30,
    )
