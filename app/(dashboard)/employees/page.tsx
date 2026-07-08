'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { employeesAPI, authAPI, projectsAPI, tasksAPI, attendanceAPI, dsrAPI, leavesAPI } from '@/lib/api-client';
import { Employee, Project, Task, Attendance, DSR, Leave } from '@/lib/types';
import { Search, UserPlus, Mail, Phone, Calendar, BadgeAlert, Award, Briefcase, X, User, Eye, CheckCircle2, FileText, Power } from 'lucide-react';

const DEPARTMENTS = [
  { id: 1, name: 'Research & Development' },
  { id: 2, name: 'Design' },
  { id: 3, name: 'Sales' },
  { id: 4, name: 'HR' },
  { id: 5, name: 'Finance' },
  { id: 6, name: 'Owner' },
  { id: 7, name: 'Sales & Marketing' },
  { id: 8, name: 'Embedded Systems' },
  { id: 9, name: 'Software Development' },
  { id: 10, name: 'Hardware Design' },
  { id: 11, name: 'Quality Assurance' }
];

const DESIGNATIONS = [
  { id: 1, name: 'Senior Developer', departmentId: 9 },
  { id: 2, name: 'Junior Developer', departmentId: 9 },
  { id: 3, name: 'Tech Lead', departmentId: 9 },
  { id: 4, name: 'Senior Designer', departmentId: 2 },
  { id: 5, name: 'UI Designer', departmentId: 2 },
  { id: 6, name: 'Sales Executive', departmentId: 3 },
  { id: 7, name: 'Sales Manager', departmentId: 3 },
  { id: 8, name: 'HR Manager', departmentId: 4 },
  { id: 9, name: 'Finance Manager', departmentId: 5 },
  { id: 10, name: 'Super Admin', departmentId: 6 },
  { id: 11, name: 'R & D Head', departmentId: 1 },
  { id: 12, name: 'Embedded Firmware Developer', departmentId: 8 },
  { id: 13, name: 'Hardware Design Engineer', departmentId: 10 },
  { id: 14, name: 'QA Automation Engineer', departmentId: 11 },
  { id: 15, name: 'Junior QA Tester', departmentId: 11 },
  { id: 16, name: 'Embedded Software Engineer', departmentId: 8 },
  { id: 17, name: 'Lead Hardware Architect', departmentId: 10 }
];

const ROLES = [
  { id: 1, name: 'SUPER_ADMIN' },
  { id: 2, name: 'ADMIN' },
  { id: 3, name: 'MANAGER' },
  { id: 4, name: 'EMPLOYEE' }
];

export default function EmployeesPage() {
  const { token, user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Employee work profile view states
  const [selectedEmployeeForView, setSelectedEmployeeForView] = useState<Employee | null>(null);
  const [showWorkProfileModal, setShowWorkProfileModal] = useState(false);
  const [employeeProjects, setEmployeeProjects] = useState<Project[]>([]);
  const [employeeTasks, setEmployeeTasks] = useState<Task[]>([]);
  const [employeeAttendance, setEmployeeAttendance] = useState<Attendance[]>([]);
  const [employeeLeaves, setEmployeeLeaves] = useState<Leave[]>([]);
  const [employeeDSRs, setEmployeeDSRs] = useState<DSR[]>([]);
  const [activeModalTab, setActiveModalTab] = useState<'work' | 'attendance' | 'leaves' | 'dsr'>('work');
  const [detailsDateFilter, setDetailsDateFilter] = useState('');
  const [isLoadingWorkProfile, setIsLoadingWorkProfile] = useState(false);

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState(4); // Default to EMPLOYEE
  const [departmentId, setDepartmentId] = useState(1); // Default to Engineering
  const [designationId, setDesignationId] = useState(1);
  const [joinDate, setJoinDate] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'OnLeave'>('Active');
  const [managerId, setManagerId] = useState<number | ''>('');

  const fetchEmployees = async () => {
    try {
      if (!token) return;
      const response = await employeesAPI.getAll({}, token);
      const data = Array.isArray(response) ? response : response.data || response.employees || [];
      setEmployees(data);
    } catch (error) {
      console.warn('Failed to fetch employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenWorkProfile = async (emp: Employee) => {
    setSelectedEmployeeForView(emp);
    setShowWorkProfileModal(true);
    setIsLoadingWorkProfile(true);
    setActiveModalTab('work');
    setDetailsDateFilter('');
    try {
      const tokenToUse = token || '';
      // Fetch projects
      const projectsRes = await projectsAPI.getAll({}, tokenToUse);
      const allProjects: Project[] = projectsRes.data || [];
      const assignedProjects = allProjects.filter(p =>
        p.members?.some(m => m.userId === emp.userId) || p.teamLeadId === emp.userId
      );
      setEmployeeProjects(assignedProjects);

      // Fetch tasks
      const tasksRes = await tasksAPI.getAll({ assignedTo: emp.userId }, tokenToUse);
      setEmployeeTasks(tasksRes.data || []);

      // Fetch attendance
      const attendanceRes = await attendanceAPI.getAll({ employeeId: emp.id }, tokenToUse);
      setEmployeeAttendance(Array.isArray(attendanceRes) ? attendanceRes : attendanceRes.data || []);

      // Fetch leaves
      const leavesRes = await leavesAPI.getAll({ employeeId: emp.id }, tokenToUse);
      setEmployeeLeaves(Array.isArray(leavesRes) ? leavesRes : leavesRes.data || []);

      // Fetch DSRs
      const dsrRes = await dsrAPI.getAll({ employeeId: emp.id }, tokenToUse);
      setEmployeeDSRs(Array.isArray(dsrRes) ? dsrRes : dsrRes.data || []);
    } catch (error) {
      console.error('Failed to load employee work profile details:', error);
    } finally {
      setIsLoadingWorkProfile(false);
    }
  };

  const handleToggleEmployeeStatus = async (emp: Employee) => {
    if (!token) return;
    const newStatus = emp.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await employeesAPI.update(emp.id, { status: newStatus }, token);
      
      // Update local state lists
      setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, status: newStatus } : e));
      if (selectedEmployeeForView && selectedEmployeeForView.id === emp.id) {
        setSelectedEmployeeForView(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to update employee status');
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [token]);

  // Update designation dropdown options when department changes
  useEffect(() => {
    const defaultDesignation = DESIGNATIONS.find(d => d.departmentId === departmentId);
    if (defaultDesignation) {
      setDesignationId(defaultDesignation.id);
    }
  }, [departmentId]);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setIsSubmitting(true);

    if (!username || !email || !password || !firstName || !lastName) {
      setFormError('Please fill in all required fields');
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Register User Account
      const userRegisterResponse = await authAPI.register(
        username,
        email,
        password,
        roleId,
        departmentId,
        token || undefined
      );

      let newUserId;
      if (userRegisterResponse && userRegisterResponse.user) {
        newUserId = userRegisterResponse.user.id;
      } else if (userRegisterResponse && userRegisterResponse.id) {
        newUserId = userRegisterResponse.id;
      } else {
        throw new Error('Failed to retrieve registered user ID');
      }

      // Update role & department parameters on user if needed (the register route assigns roleId & departmentId from body)
      // 2. Create Employee Profile
      await employeesAPI.create({
        userId: newUserId,
        firstName,
        lastName,
        email,
        phone,
        departmentId,
        designationId,
        status,
        joinDate: joinDate ? new Date(joinDate) : new Date(),
        managerId: managerId ? Number(managerId) : undefined
      }, token || undefined);

      setFormSuccess('Employee created successfully!');

      // Clear Form
      setUsername('');
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setPhone('');
      setJoinDate('');
      setStatus('Active');
      setManagerId('');

      // Refresh list & close modal
      await fetchEmployees();
      setTimeout(() => {
        setShowAddModal(false);
        setFormSuccess('');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Failed to create employee. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
    const emailAddr = (emp.email || '').toLowerCase();
    const departmentName = (emp.department?.name || '').toLowerCase();
    const designationName = (emp.designation?.name || '').toLowerCase();
    const query = search.toLowerCase();

    return (
      fullName.includes(query) ||
      emailAddr.includes(query) ||
      departmentName.includes(query) ||
      designationName.includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">Active</span>;
      case 'OnLeave':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-full">On Leave</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded-full">Inactive</span>;
    }
  };

  return (
    <div className="space-y-8 bg-slate-50 min-h-screen p-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Employees</h1>
          <p className="text-slate-500 mt-1">Manage and view employee directory information</p>
        </div>
        {(user?.roleName === 'SUPER_ADMIN' || user?.roleName === 'ADMIN') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-semibold shadow-md shadow-blue-600/10 cursor-pointer"
          >
            <UserPlus size={18} />
            Add Employee
          </button>
        )}
      </div>

      {/* Filter / Search section */}
      <div className="flex items-center gap-2 max-w-md bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
        <Search size={18} className="text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, email, department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
        />
      </div>

      {/* Directory Content */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <div className="space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/4 animate-pulse"></div>
            <div className="h-10 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-10 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-10 bg-slate-200 rounded animate-pulse"></div>
          </div>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
          <BadgeAlert size={48} className="text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-800">No employees found</h3>
          <p className="text-sm text-slate-500 mt-1">Try adjusting your search criteria.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Designation</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Join Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">
                          {emp.firstName?.[0] || 'E'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">
                            {emp.firstName || ''} {emp.lastName || ''}
                          </div>
                          <div className="text-xs text-slate-500">Employee ID: #{emp.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1 text-sm text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Mail size={14} className="text-slate-400" />
                          <span>{emp.email}</span>
                        </div>
                        {emp.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone size={14} className="text-slate-400" />
                            <span>{emp.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm text-slate-700">
                        <Briefcase size={14} className="text-slate-400" />
                        <span>{emp.department?.name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm text-slate-700">
                        <Award size={14} className="text-slate-400" />
                        <span>{emp.designation?.name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(emp.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Calendar size={14} className="text-slate-400" />
                        <span>
                          {emp.joinDate ? new Date(emp.joinDate).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-1.5">
                      {(user?.roleName === 'SUPER_ADMIN' || user?.roleName === 'ADMIN' || user?.roleName === 'MANAGER' || emp.userId === user?.id) && (
                        <button
                          onClick={() => handleOpenWorkProfile(emp)}
                          className="p-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                          title="View Employee Work Profile"
                        >
                          <Eye size={15} />
                          <span className="text-xs font-bold px-0.5">View Work</span>
                        </button>
                      )}
                      {(user?.roleName === 'SUPER_ADMIN' || user?.roleName === 'ADMIN') && (
                        <button
                          onClick={() => handleToggleEmployeeStatus(emp)}
                          className={`p-2 border rounded-lg transition inline-flex items-center gap-1 cursor-pointer ${
                            emp.status === 'Active'
                              ? 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                          }`}
                          title={emp.status === 'Active' ? 'Deactivate Employee' : 'Activate Employee'}
                        >
                          <Power size={14} />
                          <span className="text-xs font-bold px-0.5">
                            {emp.status === 'Active' ? 'Deactivate' : 'Activate'}
                          </span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <User size={20} className="text-blue-600" />
                Add New Employee Profile
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="p-6 space-y-6">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium">
                  {formSuccess}
                </div>
              )}

              {/* Login Account Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Account Credentials</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Username *</label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. employeeemployee"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="employee@hbeonlabs.com"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Password *</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Personal Details Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Personal Profile</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">First Name *</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. employee"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. employee"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +1-555-0199"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Assignment Details Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Roles & Assignment</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">System Role *</label>
                    <select
                      value={roleId}
                      onChange={(e) => setRoleId(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                    >
                      {ROLES.map(role => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Department *</label>
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                    >
                      {DEPARTMENTS.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Designation *</label>
                    <select
                      value={designationId}
                      onChange={(e) => setDesignationId(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                    >
                      {DESIGNATIONS.filter(d => d.departmentId === departmentId).map(desig => (
                        <option key={desig.id} value={desig.id}>{desig.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Join Date</label>
                    <input
                      type="date"
                      value={joinDate}
                      onChange={(e) => setJoinDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="OnLeave">On Leave</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Assign Manager</label>
                    <select
                      value={managerId}
                      onChange={(e) => setManagerId(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                    >
                      <option value="">No Manager (Unassigned)...</option>
                      {employees
                        .filter(emp => emp.user?.roleName === 'MANAGER' || emp.user?.roleName === 'ADMIN' || emp.user?.roleName === 'SUPER_ADMIN')
                        .map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName} ({emp.user?.username})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition shadow-md shadow-blue-600/10 cursor-pointer"
                >
                  {isSubmitting ? 'Creating Profile...' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Work Profile Modal */}
      {showWorkProfileModal && selectedEmployeeForView && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-extrabold text-lg shadow-md shadow-blue-600/10">
                  {selectedEmployeeForView.firstName?.[0] || 'E'}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedEmployeeForView.firstName} {selectedEmployeeForView.lastName}
                  </h2>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">
                    {selectedEmployeeForView.designation?.name || 'Staff'} • {selectedEmployeeForView.department?.name || 'Unassigned Department'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWorkProfileModal(false)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={22} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Pane: Details Card */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Employee Information</h3>

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Username</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedEmployeeForView.user?.username || 'N/A'}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Email Address</p>
                    <p className="text-sm font-semibold text-slate-800 break-all">{selectedEmployeeForView.email}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Phone Number</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedEmployeeForView.phone || 'N/A'}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Reporting Manager</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {selectedEmployeeForView.manager ? `${selectedEmployeeForView.manager.username}` : 'Unassigned'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">System Role</p>
                    <span className="inline-block text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded px-2 py-0.5 mt-0.5">
                      {selectedEmployeeForView.user?.roleName === 'SUPER_ADMIN' ? 'Super Admin' : (selectedEmployeeForView.user?.roleName || 'EMPLOYEE')}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Date of Joining</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {selectedEmployeeForView.joinDate ? new Date(selectedEmployeeForView.joinDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedEmployeeForView.status)}</div>
                  </div>

                  {(user?.roleName === 'SUPER_ADMIN' || user?.roleName === 'ADMIN') && (
                    <div className="pt-2">
                      <button
                        onClick={() => handleToggleEmployeeStatus(selectedEmployeeForView)}
                        className={`w-full py-2 px-3 border rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          selectedEmployeeForView.status === 'Active'
                            ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        <Power size={13} />
                        <span>{selectedEmployeeForView.status === 'Active' ? 'Deactivate Employee' : 'Activate Employee'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Pane: Assigned Projects, Tasks, Attendance, Leaves, DSRs */}
              <div className="lg:col-span-2 space-y-6">
                {/* Tabs Header */}
                <div className="flex border-b border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('work')}
                    className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
                      activeModalTab === 'work'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Work & Tasks
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('attendance')}
                    className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
                      activeModalTab === 'attendance'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Attendance
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('leaves')}
                    className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
                      activeModalTab === 'leaves'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Leaves History
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('dsr')}
                    className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
                      activeModalTab === 'dsr'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    DSR Reports
                  </button>
                </div>

                {/* Date Filter Console */}
                <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-700">Filter logs by specific date:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={detailsDateFilter}
                      onChange={(e) => setDetailsDateFilter(e.target.value)}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 text-black"
                    />
                    {detailsDateFilter && (
                      <button
                        onClick={() => setDetailsDateFilter('')}
                        className="px-2 py-1 bg-slate-250 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-extrabold transition cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>
                </div>

                {/* Content */}

                {isLoadingWorkProfile ? (
                  <div className="space-y-4 animate-pulse py-8">
                    <div className="h-6 bg-slate-200 rounded w-1/3"></div>
                    <div className="h-20 bg-slate-200 rounded w-full"></div>
                    <div className="h-6 bg-slate-200 rounded w-1/4 pt-4"></div>
                    <div className="h-24 bg-slate-200 rounded w-full"></div>
                  </div>
                ) : activeModalTab === 'work' ? (
                  <>
                    {/* Projects Section */}
                    <div className="space-y-3 animate-fade-in">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                        <Briefcase size={16} className="text-blue-600" />
                        Assigned Projects ({employeeProjects.length})
                      </h3>
                      {employeeProjects.length === 0 ? (
                        <p className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-4 text-center">
                          No active projects assigned to this employee.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {employeeProjects.map(proj => (
                            <div key={proj.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-blue-200 transition">
                              <h4 className="font-bold text-slate-800 text-sm line-clamp-1 mb-1">{proj.name}</h4>
                              <p className="text-[11px] text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                                {proj.description || 'No description.'}
                              </p>
                              <div>
                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                                  <span>Progress</span>
                                  <span>{proj.progress}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-600 rounded-full transition-all"
                                    style={{ width: `${proj.progress}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Tasks Section */}
                    <div className="space-y-3 pt-2 animate-fade-in">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                        <CheckCircle2 size={16} className="text-blue-600" />
                        Assigned Tasks ({(detailsDateFilter ? employeeTasks.filter(tsk => tsk.dueDate && new Date(tsk.dueDate).toISOString().split('T')[0] === detailsDateFilter) : employeeTasks).length})
                      </h3>
                      {(detailsDateFilter ? employeeTasks.filter(tsk => tsk.dueDate && new Date(tsk.dueDate).toISOString().split('T')[0] === detailsDateFilter) : employeeTasks).length === 0 ? (
                        <p className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-4 text-center">
                          No tasks found {detailsDateFilter ? `for ${new Date(detailsDateFilter).toLocaleDateString()}` : 'assigned to this employee'}.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {(detailsDateFilter ? employeeTasks.filter(tsk => tsk.dueDate && new Date(tsk.dueDate).toISOString().split('T')[0] === detailsDateFilter) : employeeTasks).map(tsk => (
                            <div key={tsk.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm animate-fade-in">
                              <div className="space-y-1">
                                <h4 className="font-bold text-slate-800 text-sm">{tsk.title}</h4>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                                  <span>Est: {tsk.estimatedHours || 0}h</span>
                                  <span>•</span>
                                  <span>Due: {tsk.dueDate ? new Date(tsk.dueDate).toLocaleDateString() : 'N/A'}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tsk.priority === 'Critical' ? 'bg-red-50 text-red-600 border-red-200' :
                                    tsk.priority === 'High' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                      tsk.priority === 'Medium' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                        'bg-slate-50 text-slate-600 border-slate-200'
                                  }`}>
                                  {tsk.priority}
                                </span>
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border ${tsk.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    tsk.status === 'InProgress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                      tsk.status === 'Closed' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                        'bg-blue-50 text-blue-700 border-blue-200'
                                  }`}>
                                  {tsk.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : activeModalTab === 'attendance' ? (
                  <div className="space-y-3 animate-fade-in">
                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                      <Calendar size={16} className="text-blue-600" />
                      Attendance Logs ({(detailsDateFilter ? employeeAttendance.filter(log => new Date(log.date).toISOString().split('T')[0] === detailsDateFilter) : employeeAttendance).length})
                    </h3>
                    {(detailsDateFilter ? employeeAttendance.filter(log => new Date(log.date).toISOString().split('T')[0] === detailsDateFilter) : employeeAttendance).length === 0 ? (
                      <p className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-4 text-center">
                        No attendance records found {detailsDateFilter ? `for ${new Date(detailsDateFilter).toLocaleDateString()}` : 'for this employee'}.
                      </p>
                    ) : (
                      <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm max-h-[350px]">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 font-extrabold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                              <th className="px-4 py-3">Date</th>
                              <th className="px-4 py-3">Check In</th>
                              <th className="px-4 py-3">Check Out</th>
                              <th className="px-4 py-3">Working Hours</th>
                              <th className="px-4 py-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {(detailsDateFilter ? employeeAttendance.filter(log => new Date(log.date).toISOString().split('T')[0] === detailsDateFilter) : employeeAttendance).map(log => (
                              <tr key={log.id} className="hover:bg-slate-50/50 transition">
                                <td className="px-4 py-3 font-semibold text-slate-900">{new Date(log.date).toLocaleDateString()}</td>
                                <td className="px-4 py-3">{log.checkInTime || '-'}</td>
                                <td className="px-4 py-3">{log.checkOutTime || '-'}</td>
                                <td className="px-4 py-3">{log.workingHours ? `${log.workingHours}h` : '-'}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                    log.status === 'Present'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}>
                                    {log.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : activeModalTab === 'leaves' ? (
                  <div className="space-y-3 animate-fade-in">
                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                      <Calendar size={16} className="text-blue-600" />
                      Leave Applications ({(detailsDateFilter ? employeeLeaves.filter(leave => {
                        const d = new Date(detailsDateFilter);
                        const s = new Date(leave.startDate);
                        const e = new Date(leave.endDate);
                        return d >= s && d <= e;
                      }) : employeeLeaves).length})
                    </h3>
                    {(detailsDateFilter ? employeeLeaves.filter(leave => {
                      const d = new Date(detailsDateFilter);
                      const s = new Date(leave.startDate);
                      const e = new Date(leave.endDate);
                      return d >= s && d <= e;
                    }) : employeeLeaves).length === 0 ? (
                      <p className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-4 text-center">
                        No leave records found {detailsDateFilter ? `for ${new Date(detailsDateFilter).toLocaleDateString()}` : 'for this employee'}.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                        {(detailsDateFilter ? employeeLeaves.filter(leave => {
                          const d = new Date(detailsDateFilter);
                          const s = new Date(leave.startDate);
                          const e = new Date(leave.endDate);
                          return d >= s && d <= e;
                        }) : employeeLeaves).map(leave => (
                          <div key={leave.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 border border-slate-200 rounded font-bold text-[10px]">
                                  {leave.leaveType}
                                </span>
                                <span className="text-xs font-bold text-slate-800">
                                  {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 font-medium">Reason: {leave.reason || 'N/A'}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border ${
                              leave.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                              leave.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                              'bg-amber-50 text-amber-600 border-amber-205'
                            }`}>
                              {leave.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 animate-fade-in">
                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                      <FileText size={16} className="text-blue-600" />
                      Daily Status Reports ({(detailsDateFilter ? employeeDSRs.filter(dsr => new Date(dsr.date).toISOString().split('T')[0] === detailsDateFilter) : employeeDSRs).length})
                    </h3>
                    {(detailsDateFilter ? employeeDSRs.filter(dsr => new Date(dsr.date).toISOString().split('T')[0] === detailsDateFilter) : employeeDSRs).length === 0 ? (
                      <p className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-4 text-center">
                        No DSR records found {detailsDateFilter ? `for ${new Date(detailsDateFilter).toLocaleDateString()}` : 'for this employee'}.
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                        {(detailsDateFilter ? employeeDSRs.filter(dsr => new Date(dsr.date).toISOString().split('T')[0] === detailsDateFilter) : employeeDSRs).map(dsr => (
                          <div key={dsr.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                              <div>
                                <span className="text-xs font-bold text-slate-900">{new Date(dsr.date).toLocaleDateString()}</span>
                                <span className="text-[10px] font-bold text-slate-400 block mt-0.5">Project: {dsr.project?.name || 'Unassigned'}</span>
                              </div>
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border ${
                                dsr.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                dsr.status === 'Submitted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {dsr.status}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs font-medium text-slate-600">
                              <div>
                                <span className="text-[10px] text-slate-400 font-bold block uppercase">Worked Description</span>
                                <p className="mt-0.5 leading-relaxed text-slate-700 font-normal">{dsr.workDescription || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 font-bold block uppercase">Tomorrows Plan</span>
                                <p className="mt-0.5 leading-relaxed text-slate-700 font-normal">{dsr.tomorrowsPlan || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end p-6 border-t border-slate-200 bg-slate-50/50">
              <button
                onClick={() => setShowWorkProfileModal(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
