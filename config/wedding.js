const WEDDING_SERVICES = [
  { key: 'planning', label: 'Planning and consultation' },
  { key: 'budget', label: 'Budget planning and expense tracking' },
  { key: 'timeline', label: 'Event itinerary and function timelines' },
  { key: 'vendors', label: 'Vendor sourcing and coordination' },
  { key: 'venue', label: 'Venue selection and site visits' },
  { key: 'decor', label: 'Décor and production coordination' },
  { key: 'rsvp', label: 'Guest RSVP and communications' },
  { key: 'rooms', label: 'Accommodation and rooming lists' },
  { key: 'transport', label: 'Airport and local transport logistics' },
  { key: 'hospitality', label: 'Hospitality desk and guest assistance' },
  { key: 'eventDay', label: 'Event-day coordination' },
  { key: 'food', label: 'Food and beverage coordination' },
  { key: 'staffing', label: 'Staffing and manpower' },
  { key: 'rituals', label: 'Pooja and ritual coordination' },
  { key: 'stationery', label: 'Invitations, stationery and itineraries' },
  { key: 'gifting', label: 'Hampers and gifting' },
  { key: 'postEvent', label: 'Post-event debrief and report' },
];

const WEDDING_BRIEF_VERSION = '1.0-draft';
const WEDDING_EXCLUSIONS = [
  'Venue rental, vendor charges, catering, décor / production, entertainment, photography / videography, accommodation, travel, transport and guest incidentals.',
  'Permits, licences, insurance, security, medical services, power backup, venue deposits and other statutory or venue-mandated charges.',
  'Extra functions, venues, event days, overtime, overnight or 24-hour staffing, unlimited meetings or revisions, and last-minute requests.',
  'Legal, tax, accounting or other specialist advice; guarantees about weather, Vendor performance, availability or third-party approvals.',
];

function blankWeddingPlanning() {
  return {
    eventTitle: '',
    functions: [{ name: 'Wedding / Pheras', date: '', startTime: '', endTime: '', venue: '', city: '', guests: '', notes: '' }],
    vision: {
      theme: '', aesthetic: '', colors: '', references: '', traditions: '',
      guestExperience: '', dietaryAccessibility: '', entertainment: '',
      privacyRestrictions: '', budgetPriorities: '',
    },
    scope: WEDDING_SERVICES.map(({ key }) => ({ key, included: null, limits: '', owner: '' })),
    commercial: {
      approximateBudget: '', vendorBudget: '', planningFee: '', taxTreatment: '',
      payments: [{ milestone: 'Booking confirmation', percentage: '', amount: '', due: '' }, { milestone: 'Planning milestone', percentage: '', amount: '', due: '' }, { milestone: 'Pre-event / final payment', percentage: '', amount: '', due: '' }],
      cancellation: '', postponement: '', overtime: '', teamExpenses: '', extraSpendLimit: '',
      permitResponsibility: '', budgetBreakdown: '', roomRequirement: '',
    },
    vendors: [],
    contacts: { primaryDecisionMaker: '', financialContact: '', onGroundContact: '' },
  };
}

module.exports = { WEDDING_SERVICES, WEDDING_EXCLUSIONS, WEDDING_BRIEF_VERSION, blankWeddingPlanning };
