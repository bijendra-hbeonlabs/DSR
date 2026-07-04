// Role types
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

// User/Auth types
export interface User {
  id: number;
  username: string;
  email: string;
  roleId: number;
  roleName: UserRole;
  departmentId?: number;
  active: boolean;
  employee?: Employee;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: number;
  name: UserRole;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

// Department types
export interface Department {
  id: number;
  name: string;
  description?: string;
  headId?: number;
  head?: User;
  createdAt: string;
  updatedAt: string;
}

// Designation types
export interface Designation {
  id: number;
  name: string;
  departmentId?: number;
  department?: Department;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Employee types
export interface Employee {
  id: number;
  userId: number;
  user?: User;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  departmentId?: number;
  department?: Department;
  designationId?: number;
  designation?: Designation;
  managerId?: number;
  manager?: User;
  joinDate?: string;
  status: 'Active' | 'Inactive' | 'OnLeave';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// Attendance types
export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'HalfDay' | 'Holiday' | 'Leave' | 'Remote' | 'WFH';

export interface Attendance {
  id: number;
  employeeId: number;
  employee?: Employee;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: AttendanceStatus;
  workingHours: number;
  overtimeHours: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Project types
export type ProjectStatus = 'Planning' | 'Active' | 'OnHold' | 'Completed';

export interface Project {
  id: number;
  name: string;
  description?: string;
  status: ProjectStatus;
  progress: number;
  startDate?: string;
  endDate?: string;
  teamLeadId?: number;
  teamLead?: User;
  departmentId?: number;
  department?: Department;
  members?: ProjectMember[];
  tasks?: Task[];
  createdAt: string;
  updatedAt: string;
}

// ProjectMember types
export interface ProjectMember {
  id: number;
  projectId: number;
  project?: Project;
  userId: number;
  user?: User;
  role: 'Lead' | 'Member';
  joinDate: string;
  createdAt: string;
  updatedAt: string;
}

// Task types
export type TaskStatus = 'Pending' | 'InProgress' | 'Completed' | 'Closed';
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Task {
  id: number;
  title: string;
  description?: string;
  projectId: number;
  project?: Project;
  assignedTo?: number;
  assignee?: User;
  assignedBy?: number;
  createdBy?: User;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string;
  startDate?: string;
  estimatedHours?: number;
  actualHours: number;
  progressPercentage: number;
  comments: any[];
  attachments: any[];
  checklist: any[];
  createdAt: string;
  updatedAt: string;
}

// DSR types
export type DSRStatus = 'Draft' | 'Submitted' | 'UnderReview' | 'Approved' | 'Rejected';

export interface DSR {
  id: number;
  employeeId: number;
  employee?: Employee;
  date: string;
  projectId?: number;
  project?: Project;
  taskIds: number[];
  startTime?: string;
  endTime?: string;
  completionPercentage: number;
  priority: Priority;
  workDescription?: string;
  issues?: string;
  tomorrowsPlan?: string;
  status: DSRStatus;
  attachments: any[];
  reviewedBy?: number;
  reviewer?: User;
  reviewComments?: string;
  submittedAt?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Leave types
export type LeaveType = 'Sick' | 'Personal' | 'Annual' | 'Casual' | 'Maternity';
export type LeaveStatus = 'Applied' | 'Approved' | 'Rejected';

export interface Leave {
  id: number;
  employeeId: number;
  employee?: Employee;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
  status: LeaveStatus;
  approvedBy?: number;
  approver?: User;
  appliedDate: string;
  createdAt: string;
  updatedAt: string;
}

// Announcement types
export interface Announcement {
  id: number;
  title: string;
  content: string;
  postedBy: number;
  postedByUser?: User;
  departmentId?: number;
  department?: Department;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
}

// Notification types
export interface Notification {
  id: number;
  userId: number;
  user?: User;
  type: 'TaskAssigned' | 'TaskCompleted' | 'DSRReminder' | 'AttendanceReminder' | 'LeaveApproved' | 'SystemAnnouncement';
  title: string;
  message: string;
  data: Record<string, any>;
  read: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Auth response types
export interface AuthResponse {
  token: string;
  user: User;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  total?: number;
  error?: string;
  details?: string;
  message?: string;
}

// Dashboard stats type
export interface DashboardStats {
  totalEmployees?: number;
  totalUsers?: number;
  totalProjects?: number;
  activeProjects?: number;
  todaysPresentCount?: number;
  pendingDSRs?: number;
  pendingLeaves?: number;
  overdueTasks?: number;
  teamSize?: number;
  myTasks?: number;
  completedTasks?: number;
  myProjects?: number;
  myPendingDSRs?: number;
  teamPendingDSRs?: number;
  todaysDSRDraft?: number;
}
