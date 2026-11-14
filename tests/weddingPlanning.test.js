const test = require('node:test');
const assert = require('node:assert/strict');
const { Validator } = require('../lib/validate');
const { WEDDING_SERVICES, blankWeddingPlanning } = require('../config/wedding');
const { readWeddingPlanning, hasCompletePaymentPercentages } = require('../services/weddingPlanning');

const validPlanning = () => {
  const planning = blankWeddingPlanning();
  planning.functions = [{ name: 'Wedding', date: '2099-11-21', venue: 'Garden', city: 'Jaipur', guests: '250' }];
  planning.scope = planning.scope.map((item) => ({ ...item, included: false }));
  return planning;
};

test('accepts a complete event schedule and an explicit choice for every service', () => {
  const validator = new Validator();
  const planning = readWeddingPlanning(validPlanning(), { draft: false, validator });
  validator.done();
  assert.equal(planning.functions.length, 1);
  assert.equal(planning.functions[0].venue, 'Garden');
  assert.equal(planning.scope.length, WEDDING_SERVICES.length);
  assert.ok(planning.scope.every((item) => item.included === false));
});

test('rejects a submitted brief with an unmarked service or incomplete function', () => {
  const input = validPlanning();
  input.scope[0].included = null;
  input.functions[0].venue = '';
  const validator = new Validator();
  readWeddingPlanning(input, { draft: false, validator });
  assert.throws(() => validator.done(), (error) => {
    assert.equal(error.status, 422);
    assert.ok(error.fields['planning.scope.planning']);
    assert.ok(error.fields['planning.functions.0.venue']);
    return true;
  });
});

test('allows incomplete service selections in a saved draft', () => {
  const validator = new Validator();
  const planning = readWeddingPlanning(blankWeddingPlanning(), { draft: true, validator });
  validator.done();
  assert.ok(planning.scope.every((item) => item.included === null));
});

test('requires payment percentages to total 100 percent when supplied', () => {
  const input = validPlanning();
  input.commercial.payments = [{ milestone: 'Booking', percentage: '50', amount: '', due: 'On signing' }];
  const validator = new Validator();
  readWeddingPlanning(input, { draft: false, validator });
  assert.throws(() => validator.done(), (error) => {
    assert.equal(error.status, 422);
    assert.ok(error.fields['planning.commercial.payments']);
    return true;
  });

  test('checks decimal payment percentages without floating point rounding errors', () => {
    assert.equal(hasCompletePaymentPercentages([
      { percentage: '33.33' }, { percentage: '33.33' }, { percentage: '33.34' },
    ]), true);
    assert.equal(hasCompletePaymentPercentages([{ percentage: '99.99' }]), false);
  });
});
