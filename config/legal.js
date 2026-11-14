// Legal text lives here so it can be updated without touching application code.
// Bump `termsVersion` whenever the wording changes: every acceptance records the version.
// PLACEHOLDER TEXT — replace with your approved legal copy before going live.
const { WEDDING_BRIEF_VERSION } = require('./wedding');

module.exports = {
  termsVersion: '1.0-placeholder',
  weddingBriefVersion: WEDDING_BRIEF_VERSION,
  weddingBriefNotice: [
    'This submission records your wedding details, requested services and commercial preferences for planner review.',
    'It is not a final booking confirmation or a completed services contract. The Planner must complete and approve the commercial terms, scope, cancellation and postponement terms in a separate written agreement.',
    'Do not treat estimates or vendor availability as confirmed until the Planner confirms them in writing.',
    'Schedule C exclusions apply unless a service or cost is specifically added in the Planner’s written proposal.',
  ],
  terms: [
    'Terms & Conditions (placeholder). Replace this text in config/legal.js with your approved terms.',
    'By submitting this application you confirm that the details you have provided are accurate.',
    'Submitting an application does not guarantee a booking or an engagement. All requests are reviewed before confirmation.',
  ],
  privacy: [
    'Privacy Policy (placeholder). Replace this text in config/legal.js with your approved privacy policy.',
    'We store wedding schedules, preferences, budgets, vendor details and signatures submitted for planning requests. Live photos are collected only where required for staff applications.',
  ],
  consent: 'I consent to my details, live photo and signature being stored and reviewed for this application.',
};
