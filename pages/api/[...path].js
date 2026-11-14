const { validateEnv } = require('../../lib/env');
const { connectDB } = require('../../lib/db');
const { createApiApp } = require('../../server/apiApp');

const app = createApiApp();
let initialization;

async function initialize() {
  if (!initialization) {
    initialization = (async () => {
      validateEnv();
      await connectDB();
    })().catch((error) => {
      initialization = null;
      throw error;
    });
  }
  await initialization;
}

async function handler(req, res) {
  try {
    await initialize();
    return app(req, res);
  } catch (error) {
    console.error('API initialization failed:', error.message);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_CONFIGURATION', message: 'The server is not ready. Please try again later.' },
    });
  }
}

handler.config = { api: { bodyParser: false } };

module.exports = handler;
