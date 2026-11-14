const REQUIRED = ['MONGODB_URI', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'JWT_SECRET'];

function validateEnv() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  const prod = process.env.NODE_ENV === 'production';
  if (process.env.JWT_SECRET.length < 32 || /^(your-|replace-with|change-me|changeme)/i.test(process.env.JWT_SECRET)) throw new Error('JWT_SECRET must be a unique random value of at least 32 characters.');
  const provider = process.env.OTP_PROVIDER || 'console';
  if (!['console', 'smtp', 'resend'].includes(provider)) throw new Error(`Unknown OTP_PROVIDER "${provider}". Use "console", "smtp", or "resend".`);
  if (prod && provider === 'console') throw new Error('OTP_PROVIDER=console is not allowed in production. Configure SMTP email delivery.');
  if (provider === 'smtp') {
    const m = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'].filter((k) => !process.env[k]);
    if (m.length) throw new Error(`Missing SMTP variables: ${m.join(', ')}`);
    if (!/^\d+$/.test(String(process.env.SMTP_PORT)) || Number(process.env.SMTP_PORT) < 1 || Number(process.env.SMTP_PORT) > 65535) throw new Error('SMTP_PORT must be a port number between 1 and 65535.');
    if (!['true', 'false'].includes(String(process.env.SMTP_SECURE || 'false').toLowerCase())) throw new Error('SMTP_SECURE must be true or false.');
  }
  if (provider === 'resend') {
    const m = ['RESEND_API_KEY', 'SMTP_FROM'].filter((k) => !process.env[k]);
    if (m.length) throw new Error(`Missing email variables: ${m.join(', ')}`);
  }
  if (process.env.TRUST_PROXY_HOPS !== undefined && (!/^\d+$/.test(process.env.TRUST_PROXY_HOPS) || Number(process.env.TRUST_PROXY_HOPS) > 5)) throw new Error('TRUST_PROXY_HOPS must be a number between 0 and 5.');
}
module.exports = { validateEnv };
