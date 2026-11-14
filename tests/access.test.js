const test = require('node:test');
const assert = require('node:assert/strict');
const { hasEmployeeAccess, canEditStaffApplication } = require('../lib/access');

const approved = { state: 'submitted', status: 'Approved' };

test('employee role requires a submitted approved application', () => {
  assert.equal(hasEmployeeAccess({ staffRole: 'employee' }, approved), true);
  assert.equal(hasEmployeeAccess({ staffRole: 'applicant' }, approved), false);
  assert.equal(hasEmployeeAccess({}, approved), false);
  assert.equal(hasEmployeeAccess({ staffRole: 'employee' }, { state: 'draft', status: 'Approved' }), false);
  assert.equal(hasEmployeeAccess({ staffRole: 'employee' }, { state: 'submitted', status: 'Pending' }), false);
  assert.equal(hasEmployeeAccess({ staffRole: 'employee' }, { state: 'submitted', status: 'Rejected' }), false);
});

test('employee authorization blocks applicant application edits', () => {
  assert.equal(canEditStaffApplication({ staffRole: 'employee' }), false);
  assert.equal(canEditStaffApplication({ staffRole: 'applicant' }), true);
  assert.equal(canEditStaffApplication({}), true);
});
