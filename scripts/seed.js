// Usage:  npm run seed
// Optional: ADMIN_USERNAME=... ADMIN_PASSWORD=... npm run seed   (creates/updates the admin account)
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
const mongoose = require('mongoose');
const { connectDB } = require('../lib/db');
const JobPosition = require('../models/JobPosition');
const Admin = require('../models/Admin');
const { hashPassword } = require('../lib/password');
const { DEFAULT_POSITIONS } = require('../config/options');

(async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  await connectDB();
  for (const [order, name] of DEFAULT_POSITIONS.entries()) {
    await JobPosition.updateOne({ nameKey: name.toLowerCase() }, { $setOnInsert: { name, nameKey: name.toLowerCase(), order, active: true } }, { upsert: true });
  }
  console.log(`Job positions ready (${DEFAULT_POSITIONS.length} defaults).`);
  const { ADMIN_USERNAME: u, ADMIN_PASSWORD: p } = process.env;
  if (u && p) {
    if (p.length < 10 || p.length > 128) throw new Error('ADMIN_PASSWORD must be between 10 and 128 characters.');
    const username = u.toLowerCase(); const passwordHash = await hashPassword(p);
    const admin = await Admin.findOne({ username });
    if (admin) { admin.passwordHash = passwordHash; admin.sessionVersion += 1; await admin.save(); }
    else await Admin.create({ username, passwordHash });
    console.log(`Admin "${u.toLowerCase()}" saved.`);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
