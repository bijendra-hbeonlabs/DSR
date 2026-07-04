// Role constants
const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
};

// Task status constants
const TASK_STATUS = {
  PENDING: 'Pending',
  IN_PROGRESS: 'InProgress',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
};

// DSR status constants
const DSR_STATUS = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'UnderReview',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

// Attendance status constants
const ATTENDANCE_STATUS = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  HALF_DAY: 'HalfDay',
  HOLIDAY: 'Holiday',
  LEAVE: 'Leave',
  REMOTE: 'Remote',
  WFH: 'WFH',
};

// Project status constants
const PROJECT_STATUS = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  ON_HOLD: 'OnHold',
  COMPLETED: 'Completed',
};

// Leave type constants
const LEAVE_TYPE = {
  SICK: 'Sick',
  PERSONAL: 'Personal',
  ANNUAL: 'Annual',
  CASUAL: 'Casual',
  MATERNITY: 'Maternity',
};

// Leave status constants
const LEAVE_STATUS = {
  APPLIED: 'Applied',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

// Priority constants
const PRIORITY = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

module.exports = {
  ROLES,
  TASK_STATUS,
  DSR_STATUS,
  ATTENDANCE_STATUS,
  PROJECT_STATUS,
  LEAVE_TYPE,
  LEAVE_STATUS,
  PRIORITY,
};
