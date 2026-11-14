// OTP delivery over email. SMTP configuration is kept in environment variables.
async function sendEmailOtp(email, code) {
  const provider = process.env.OTP_PROVIDER || 'console';
  if (provider === 'console') { console.log(`[DEV EMAIL OTP] ${email}: ${code}`); return; }
  if (provider === 'smtp') {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Your Wedding Staffing verification code',
      text: `Your verification code is ${code}. It is valid for 5 minutes.`,
    });
    return;
  }
  if (provider === 'resend') {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Your Wedding Staffing verification code',
        text: `Your verification code is ${code}. It is valid for 5 minutes.`,
      }),
    });
    if (!response.ok) {
      const error = new Error(`Resend request failed with status ${response.status}.`);
      error.code = `RESEND_${response.status}`;
      throw error;
    }
    return;
  }
  throw new Error(`Unknown OTP_PROVIDER "${provider}". Use "console", "smtp", or "resend".`);
}
module.exports = { sendEmailOtp };
