const { clean, startOfToday } = require('../lib/validate');
const { WEDDING_SERVICES } = require('../config/wedding');

const serviceKeys = new Set(WEDDING_SERVICES.map(({ key }) => key));
const text = (value, max) => clean(value, max);

function money(value, field, validator) {
  const amount = text(value, 32);
  if (amount && !/^(?:\d{1,3}(?:,\d{3})*|\d{1,12})(?:\.\d{1,2})?$/.test(amount)) {
    validator.fail(field, 'Enter an amount using digits and an optional decimal point.');
  }
  return amount;
}

function hasCompletePaymentPercentages(payments) {
  const percentages = (payments || []).map((payment) => payment.percentage).filter(Boolean);
  return percentages.length > 0
    && percentages.every((percentage) => /^\d{1,3}(?:\.\d{1,2})?$/.test(percentage) && Number(percentage) >= 0 && Number(percentage) <= 100)
    && percentages.reduce((total, percentage) => total + Math.round(Number(percentage) * 100), 0) === 10000;
}

function readWeddingPlanning(input, { draft, validator, summary }) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const vision = source.vision && typeof source.vision === 'object' ? source.vision : {};
  const commercial = source.commercial && typeof source.commercial === 'object' ? source.commercial : {};
  const contacts = source.contacts && typeof source.contacts === 'object' ? source.contacts : {};
  if (Array.isArray(source.functions) && source.functions.length > 12) validator.fail('planning.functions', 'Add no more than 12 event functions.');
  const rawFunctions = Array.isArray(source.functions) ? source.functions.slice(0, 12) : [];
  const functions = rawFunctions.map((row, index) => {
    const item = row && typeof row === 'object' ? row : {};
    const name = text(item.name, 80);
    const dateText = text(item.date, 32);
    const date = dateText ? new Date(`${dateText.slice(0, 10)}T12:00:00.000Z`) : null;
    const guestsText = text(item.guests, 8);
    const guests = guestsText && /^\d+$/.test(guestsText) ? Number(guestsText) : null;
    if (!draft) {
      if (!name) validator.fail(`planning.functions.${index}.name`, 'Enter a name for each function.');
      if (!date || Number.isNaN(date.getTime())) validator.fail(`planning.functions.${index}.date`, 'Enter a valid function date.');
      else if (date < startOfToday()) validator.fail(`planning.functions.${index}.date`, 'Function dates cannot be in the past.');
      if (!text(item.venue, 150)) validator.fail(`planning.functions.${index}.venue`, 'Enter a venue for each function.');
      if (guestsText && (!Number.isInteger(guests) || guests < 1 || guests > 10000)) validator.fail(`planning.functions.${index}.guests`, 'Guest count must be between 1 and 10,000.');
      if (item.startTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.startTime)) validator.fail(`planning.functions.${index}.startTime`, 'Enter a valid start time.');
      if (item.endTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.endTime)) validator.fail(`planning.functions.${index}.endTime`, 'Enter a valid end time.');
    }
    return {
      name, date: date && !Number.isNaN(date.getTime()) ? date : null,
      startTime: text(item.startTime, 20), endTime: text(item.endTime, 20),
      venue: text(item.venue, 150), city: text(item.city, 80), guests,
      notes: text(item.notes, 500),
    };
  }).filter((row) => row.name || row.date || row.venue || row.notes);

  if (!draft && !functions.length) validator.fail('planning.functions', 'Add at least one event function.');
  if (!functions.length && summary?.weddingDate) {
    functions.push({
      name: summary.eventType || 'Wedding', date: summary.weddingDate,
      startTime: '', endTime: '', venue: summary.venue || '',
      city: summary.eventLocation || '', guests: summary.guests || null, notes: '',
    });
  }

  const rawScope = Array.isArray(source.scope) ? source.scope : [];
  const scopeByKey = new Map(rawScope.filter((row) => row && serviceKeys.has(row.key)).map((row) => [row.key, row]));
  const scope = WEDDING_SERVICES.map(({ key }) => {
    const item = scopeByKey.get(key);
    const included = item?.included === true ? true : item?.included === false ? false : null;
    if (!draft && included === null) validator.fail(`planning.scope.${key}`, 'Mark each service Included or Not included.');
    return { key, included, limits: text(item?.limits, 300), owner: text(item?.owner, 120) };
  });

  const rawPayments = Array.isArray(commercial.payments) ? commercial.payments.slice(0, 6) : [];
  if (Array.isArray(commercial.payments) && commercial.payments.length > 6) validator.fail('planning.commercial.payments', 'Add no more than 6 payment milestones.');
  const payments = rawPayments.map((item, index) => ({
    milestone: text(item?.milestone, 100),
    percentage: text(item?.percentage, 6),
    amount: money(item?.amount, `planning.commercial.payments.${index}.amount`, validator),
    due: text(item?.due, 120),
  })).filter((row) => row.milestone || row.percentage || row.amount || row.due);
  const percentages = payments.map((row) => row.percentage).filter(Boolean);
  if (percentages.some((value) => !/^\d{1,3}(?:\.\d{1,2})?$/.test(value) || Number(value) < 0 || Number(value) > 100)) {
    validator.fail('planning.commercial.payments', 'Payment percentages must be between 0 and 100.');
  } else if (!draft && percentages.length && !hasCompletePaymentPercentages(payments)) {
    validator.fail('planning.commercial.payments', 'Payment percentages must total 100%.');
  }

  if (Array.isArray(source.vendors) && source.vendors.length > 20) validator.fail('planning.vendors', 'Add no more than 20 vendors.');
  const rawVendors = Array.isArray(source.vendors) ? source.vendors.slice(0, 20) : [];
  const vendors = rawVendors.map((item) => ({
    service: text(item?.service, 80), vendorName: text(item?.vendorName, 120),
    contractingParty: text(item?.contractingParty, 100),
    paymentResponsibility: text(item?.paymentResponsibility, 100),
    notes: text(item?.notes, 300),
  })).filter((row) => row.service || row.vendorName || row.notes);

  return {
    eventTitle: text(source.eventTitle, 120),
    functions,
    vision: {
      theme: text(vision.theme, 200), aesthetic: text(vision.aesthetic, 500),
      colors: text(vision.colors, 200), references: text(vision.references, 1000),
      traditions: text(vision.traditions, 500), guestExperience: text(vision.guestExperience, 500),
      dietaryAccessibility: text(vision.dietaryAccessibility, 500), entertainment: text(vision.entertainment, 500),
      privacyRestrictions: text(vision.privacyRestrictions, 500), budgetPriorities: text(vision.budgetPriorities, 500),
    },
    scope,
    commercial: {
      approximateBudget: money(commercial.approximateBudget, 'planning.commercial.approximateBudget', validator),
      vendorBudget: money(commercial.vendorBudget, 'planning.commercial.vendorBudget', validator),
      planningFee: money(commercial.planningFee, 'planning.commercial.planningFee', validator),
      taxTreatment: text(commercial.taxTreatment, 80), payments,
      cancellation: text(commercial.cancellation, 1000), postponement: text(commercial.postponement, 1000),
      overtime: text(commercial.overtime, 300), teamExpenses: text(commercial.teamExpenses, 500),
      extraSpendLimit: money(commercial.extraSpendLimit, 'planning.commercial.extraSpendLimit', validator),
      permitResponsibility: text(commercial.permitResponsibility, 500),
      budgetBreakdown: text(commercial.budgetBreakdown, 1000),
      roomRequirement: text(commercial.roomRequirement, 100),
    },
    vendors,
    contacts: {
      primaryDecisionMaker: text(contacts.primaryDecisionMaker, 160),
      financialContact: text(contacts.financialContact, 160),
      onGroundContact: text(contacts.onGroundContact, 160),
    },
  };
}

module.exports = { readWeddingPlanning, hasCompletePaymentPercentages };
