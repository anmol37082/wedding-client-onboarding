function hasEmployeeAccess(user, application) {
  return user?.staffRole === 'employee' && application?.state === 'submitted' && application?.status === 'Approved';
}

function canEditStaffApplication(user) {
  return user?.staffRole !== 'employee';
}

module.exports = { hasEmployeeAccess, canEditStaffApplication };
