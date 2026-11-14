const express = require('express');
const cookieParser = require('cookie-parser');
const { notFoundApi, errorHandler, AppError } = require('../lib/http');

function securityHeaders(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
  });
  next();
}

function createApiApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeaders, cookieParser());
  app.use('/api', express.json({ limit: '3mb' }), (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (req.body === undefined) req.body = {};
    else if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) {
      return next(new AppError(400, 'BAD_BODY', 'Request body must be a JSON object.'));
    }
    next();
  }, require('./routes'), notFoundApi, errorHandler);
  return app;
}

module.exports = { createApiApp };
