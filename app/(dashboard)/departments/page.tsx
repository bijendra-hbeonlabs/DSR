'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { employeesAPI, projectsAPI, tasksAPI, attendanceAPI, dsrAPI, leavesAPI } from '@/lib/api-client';
import { Employee, Project, Task, Attendance, DSR, Leave } from '@/lib/types';
import { Briefcase, Users, Building, ShieldAlert, Award, X, CheckCircle2, FileText, Calendar, Power } from 'lucide-react';

const DEPARTMENTS_DATA = [
  {
    id: 1,
    name: 'Research & Development (R & D)',
    description: 'Embedded systems, electronics hardware design, software development, and quality assurance validation.',
    subDepartments: [
      { name: 'Embedded Systems', description: 'Embedded Systems Engineering' },
      { name: 'Software Development', description: 'Software Engineering Department' },
      { name: 'Hardware Design', description: 'Electronics & Hardware Design' },
      { name: 'Quality Assurance', description: 'QA & Software Testing' }
    ]
  },
  { id: 2, name: 'Design', description: 'User experience, product design, brand visuals, and graphic artwork.' },
  { id: 3, name: 'Sales', description: 'Client acquisition, partnership management, sales conversion, and account management.' },
  { id: 4, name: 'HR', description: 'Talent recruitment, employee relations, workspace culture, and payroll compliance.' },
  { id: 5, name: 'Finance', description: 'Accounting audit, budget forecast, capital allocation, and financial planning.' },
  { id: 6, name: 'Owner', description: 'Executive leadership, corporate ownership, and strategic decision planning.' },
  { id: 7, name: 'Sales & Marketing', description: 'Brand expansion, corporate communications, and product sales campaigns.' }
];

export default function DepartmentsPage() {
  const { token, user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Department modal states
  const [selectedDeptForEmployees, setSelectedDeptForEmployees] = useState<{ id: number; name: string; description: string } | null>(null);
  const [showDeptEmployeesModal, setShowDeptEmployeesModal] = useState(false);

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

  useEffect(() => {
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

    fetchEmployees();
  }, [token]);

  // Group employees by department ID
  const getEmployeesInDept = (deptId: number) => {
    return employees.filter(emp => emp.departmentId === deptId);
  };

  return (
    <div className="space-y-8 bg-slate-50 min-h-screen p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Departments</h1>
        <p className="text-slate-500 mt-1">View corporate departments structure and member directory</p>
      </div>

      {/* Directory Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 h-64">
              <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DEPARTMENTS_DATA.map((dept) => {
            const deptEmployees = getEmployeesInDept(dept.id);
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => {
                  setSelectedDeptForEmployees(dept);
                  setShowDeptEmployeesModal(true);
                }}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-blue-300 transition flex flex-col justify-between p-6 space-y-6 text-left w-full cursor-pointer group"
              >
                <div className="space-y-3 w-full">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition">
                      <Building size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition">{dept.name}</h2>
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold border border-slate-200 uppercase tracking-wide">
                        ID: #00{dept.id}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium">
                    {dept.description}
                  </p>
                  {(dept as any).subDepartments && (
                    <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 w-full">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sub-departments</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(dept as any).subDepartments.map((sub: any, idx: number) => (
                          <span
                            key={idx}
                            className="inline-block text-[11px] font-semibold bg-blue-50 border border-blue-100 text-blue-700 px-2 py-0.5 rounded-full dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                          >
                            {sub.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Team roster summary */}
                <div className="w-full flex items-center justify-between text-xs text-slate-600 font-bold border-t border-slate-100 pt-4">
                  <span className="flex items-center gap-1.5 group-hover:text-blue-600 transition">
                    <Users size={14} className="text-slate-400 group-hover:text-blue-500 transition" />
                    Assigned Employees
                  </span>
                  <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 border border-blue-100 rounded-full font-extrabold group-hover:bg-blue-600 group-hover:text-white transition">
                    {deptEmployees.length}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Department Employees Modal */}
      {showDeptEmployeesModal && selectedDeptForEmployees && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in text-slate-800">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                  <Building size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 text-left">
                    {selectedDeptForEmployees.name} Department
                  </h2>
                  <p className="text-xs text-slate-400 font-semibold text-left">
                    Directory of members assigned to this department
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeptEmployeesModal(false)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs font-medium text-slate-500 leading-relaxed text-left bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                {selectedDeptForEmployees.description}
              </p>

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-left">Department Members ({getEmployeesInDept(selectedDeptForEmployees.id).length})</h3>
                
                {getEmployeesInDept(selectedDeptForEmployees.id).length === 0 ? (
                  <div className="flex items-center justify-center gap-1.5 p-6 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-400 font-semibold">
                    <ShieldAlert size={16} />
                    No employees assigned to this department.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {getEmployeesInDept(selectedDeptForEmployees.id).map(emp => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          handleOpenWorkProfile(emp);
                        }}
                        className="w-full flex items-center justify-between bg-white hover:bg-blue-50/40 border border-slate-200 hover:border-blue-200 rounded-xl p-4 transition text-left cursor-pointer group shadow-sm animate-fade-in"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-blue-50 group-hover:bg-blue-100 text-blue-700 font-extrabold text-xs flex items-center justify-center rounded-full transition">
                            {emp.firstName?.[0] || 'E'}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition block">
                              {emp.firstName} {emp.lastName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium block">
                              {emp.email}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-50 border-slate-200 text-slate-500 group-hover:bg-blue-50 group-hover:border-blue-100 group-hover:text-blue-700 transition">
                          {emp.designation?.name || 'Staff'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end p-6 border-t border-slate-200 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowDeptEmployeesModal(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition cursor-pointer"
              >
                Close List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Work Profile Modal */}
      {showWorkProfileModal && selectedEmployeeForView && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in text-slate-800">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-extrabold text-lg shadow-md shadow-blue-600/10">
                  {selectedEmployeeForView.firstName?.[0] || 'E'}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 text-left">
                    {selectedEmployeeForView.firstName} {selectedEmployeeForView.lastName}
                  </h2>
                  <p className="text-xs text-slate-500 font-bold mt-0.5 text-left">
                    {selectedEmployeeForView.designation?.name || 'Staff'} • {selectedEmployeeForView.department?.name || 'Unassigned Department'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWorkProfileModal(false)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={22} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Pane: Details Card */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5 shadow-sm text-left">
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
                <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-sm text-left">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-700">Filter logs by specific date:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={detailsDateFilter}
                      onChange={(e) => setDetailsDateFilter(e.target.value)}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 text-black animate-fade-in"
                    />
                    {detailsDateFilter && (
                      <button
                        onClick={() => setDetailsDateFilter('')}
                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-extrabold transition cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>
                </div>

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
                    <div className="space-y-3 animate-fade-in text-left">
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
                            <div key={proj.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-blue-200 transition text-left">
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
                    <div className="space-y-3 pt-2 animate-fade-in text-left">
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
                            <div key={tsk.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm text-left animate-fade-in">
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
                  <div className="space-y-3 animate-fade-in text-left">
                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                      <Calendar size={16} className="text-blue-600" />
                      Attendance Logs ({(detailsDateFilter ? employeeAttendance.filter(log => new Date(log.date).toISOString().split('T')[0] === detailsDateFilter) : employeeAttendance).length})
                    </h3>
                    {(detailsDateFilter ? employeeAttendance.filter(log => new Date(log.date).toISOString().split('T')[0] === detailsDateFilter) : employeeAttendance).length === 0 ? (
                      <p className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-4 text-center">
                        No attendance records found {detailsDateFilter ? `for ${new Date(detailsDateFilter).toLocaleDateString()}` : 'for this employee'}.
                      </p>
                    ) : (
                      <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm max-h-[350px] text-left">
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
                  <div className="space-y-3 animate-fade-in text-left">
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
                      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 text-left">
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
                  <div className="space-y-3 animate-fade-in text-left">
                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                      <FileText size={16} className="text-blue-600" />
                      Daily Status Reports ({(detailsDateFilter ? employeeDSRs.filter(dsr => new Date(dsr.date).toISOString().split('T')[0] === detailsDateFilter) : employeeDSRs).length})
                    </h3>
                    {(detailsDateFilter ? employeeDSRs.filter(dsr => new Date(dsr.date).toISOString().split('T')[0] === detailsDateFilter) : employeeDSRs).length === 0 ? (
                      <p className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-4 text-center">
                        No DSR records found {detailsDateFilter ? `for ${new Date(detailsDateFilter).toLocaleDateString()}` : 'for this employee'}.
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 text-left">
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
                type="button"
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
