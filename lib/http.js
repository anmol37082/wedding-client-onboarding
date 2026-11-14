const mongoose = require('mongoose');

class AppError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status; this.code = code; this.fields = fields;
  }
}
const ok = (res, data = {}, status = 200) => res.status(status).json({ success: true, data });
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const assertId = (id) => { if (!mongoose.isValidObjectId(id)) throw new AppError(400, 'BAD_ID', 'Invalid identifier.'); return id; };
const notFoundApi = (req, res, next) => next(new AppError(404, 'NOT_FOUND', 'Not found.'));

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = 500, code = 'SERVER_ERROR', message = 'Something went wrong. Please try again.', fields;
  if (err instanceof AppError) ({ status, code, message, fields } = err);
  else if (err.type === 'entity.parse.failed') { status = 400; code = 'BAD_JSON'; message = 'Invalid request.'; }
  else if (err.type === 'entity.too.large') { status = 413; code = 'TOO_LARGE'; message = 'The file is too large.'; }
  else if (err.name === 'CastError') { status = 400; code = 'BAD_VALUE'; message = 'A request value is invalid.'; }
  else if (err.name === 'ValidationError') { status = 422; code = 'VALIDATION'; message = 'Please correct the submitted information.'; }
  else if (err.code === 11000) { status = 409; code = 'DUPLICATE'; message = 'This record already exists.'; }
  else if (process.env.NODE_ENV === 'development') console.error(err);
  else console.error('API request failed:', req.method, req.path, err.name || 'Error', err.code || '');
  res.status(status).json({ success: false, error: { code, message, ...(fields ? { fields } : {}) } });
}
module.exports = { AppError, ok, asyncHandler, assertId, notFoundApi, errorHandler };
