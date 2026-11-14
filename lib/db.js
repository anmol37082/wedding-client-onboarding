const mongoose = require('mongoose');

let connecting = null;
async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connecting) {
    mongoose.set('sanitizeFilter', true); // blocks operator injection in query filters
    connecting = mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 }).finally(() => { connecting = null; });
  }
  await connecting;
  return mongoose.connection;
}
module.exports = { connectDB };
