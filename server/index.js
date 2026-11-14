const { loadEnvConfig } = require('@next/env');
const dev = process.env.NODE_ENV !== 'production';
loadEnvConfig(process.cwd(), dev);

const express = require('express');
const next = require('next');
const { validateEnv } = require('../lib/env');
const { connectDB } = require('../lib/db');
const { closeExpiredVacancies } = require('../services/vacancies');
const { createApiApp } = require('./apiApp');

async function main() {
  validateEnv();
  await connectDB();
  const vacancyDeadlineTimer = setInterval(() => closeExpiredVacancies().catch((e) => console.error('Vacancy deadline check failed:', e.message)), 60 * 1000);
  vacancyDeadlineTimer.unref();
  await closeExpiredVacancies();
  const nextApp = next({ dev, dir: process.cwd(), conf: { distDir: dev ? '.next-dev' : '.next' } });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 0));
  app.use(createApiApp());
  app.all('*', (req, res) => handle(req, res));

  const port = process.env.PORT === undefined ? 3000 : Number(process.env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a number between 1 and 65535.');
  const server = app.listen(port, () => console.log(`Ready on http://localhost:${port} (${dev ? 'development' : 'production'})`));
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') console.error(`Port ${port} is already in use. Stop the other server or set PORT to a free port.`);
    else console.error('HTTP server could not start:', error.code || error.message);
    process.exit(1);
  });
}
main().catch((e) => { console.error(e.message); process.exit(1); });
