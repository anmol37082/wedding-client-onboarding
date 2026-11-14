const mongoose = require('mongoose');
const Vacancy = require('../models/Vacancy');
const VacancyApplication = require('../models/VacancyApplication');
let expirationCheck;

async function closeExpiredVacancies() {
  if (expirationCheck) return expirationCheck;
  expirationCheck = (async () => {
    const now = new Date();
    const expired = await Vacancy.find({ status: mongoose.trusted({ $in: ['open', 'paused'] }), deadline: mongoose.trusted({ $lte: now }) }).select('_id title');
    for (const vacancy of expired) {
      const closed = await Vacancy.updateOne({ _id: vacancy._id, status: mongoose.trusted({ $in: ['open', 'paused'] }), deadline: mongoose.trusted({ $lte: now }) }, { $set: { status: 'closed', closedReason: 'deadline' } });
      if (closed.modifiedCount) await VacancyApplication.updateMany({ vacancy: vacancy._id }, {
        $push: { notifications: { $each: [{ type: 'vacancy-closed', title: 'Vacancy closed', message: `${vacancy.title} is now closed because the application deadline has passed.`, createdAt: now, readAt: null }], $slice: -50 } },
      });
    }
  })();
  try { return await expirationCheck; }
  finally { expirationCheck = null; }
}

async function notifyApplicants(vacancyId, { type, title, message }) {
  await VacancyApplication.updateMany({ vacancy: vacancyId }, {
    $push: { notifications: { $each: [{ type, title, message, createdAt: new Date(), readAt: null }], $slice: -50 } },
  });
}

module.exports = { closeExpiredVacancies, notifyApplicants };
