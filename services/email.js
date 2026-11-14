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
  throw new Error(`Unknown OTP_PROVIDER "${provider}". Use "console" or "smtp".`);
}
module.exports = { sendEmailOtp };
