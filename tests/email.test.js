const test = require('node:test');
const assert = require('node:assert/strict');
const { sendEmailOtp } = require('../services/email');

test('sends OTP through the Resend API', async () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    OTP_PROVIDER: process.env.OTP_PROVIDER,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SMTP_FROM: process.env.SMTP_FROM,
  };
  let request;

  process.env.OTP_PROVIDER = 'resend';
  process.env.RESEND_API_KEY = 'test-api-key';
  process.env.SMTP_FROM = 'Wedding Team <verify@example.com>';
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200 };
  };

  try {
    await sendEmailOtp('client@example.com', '012345');
    assert.equal(request.url, 'https://api.resend.com/emails');
    assert.equal(request.options.headers.Authorization, 'Bearer test-api-key');
    assert.deepEqual(JSON.parse(request.options.body), {
      from: 'Wedding Team <verify@example.com>',
      to: 'client@example.com',
      subject: 'Your Wedding Staffing verification code',
      text: 'Your verification code is 012345. It is valid for 5 minutes.',
    });
  } finally {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('reports Resend API failures as delivery errors', async () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    OTP_PROVIDER: process.env.OTP_PROVIDER,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SMTP_FROM: process.env.SMTP_FROM,
  };

  process.env.OTP_PROVIDER = 'resend';
  process.env.RESEND_API_KEY = 'test-api-key';
  process.env.SMTP_FROM = 'Wedding Team <verify@example.com>';
  global.fetch = async () => ({ ok: false, status: 403 });

  try {
    await assert.rejects(sendEmailOtp('client@example.com', '012345'), { code: 'RESEND_403' });
  } finally {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
