'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { leavesAPI, employeesAPI } from '@/lib/api-client';
import { Leave, LeaveType, LeaveStatus, Employee } from '@/lib/types';
import { Calendar, UserCheck, AlertCircle, FileText, CheckCircle2, XCircle, Clock, Plus, Trash2, ShieldAlert, ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react';

const LEAVE_TYPES: LeaveType[] = ['Sick', 'Personal', 'Casual', 'Annual', 'Maternity'];

export default function LeavesPage() {
  const { token, user } = useAuth();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my' | 'pending' | 'all'>('my');

  // Apply leave form states
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>('Sick');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const totalDays = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = firstDay.getDay();
    
    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  const getLeavesForDay = (day: Date) => {
    if (!day) return [];
    const targetTime = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    
    return filteredLeaves.filter(leave => {
      const start = new Date(leave.startDate);
      const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
      const end = new Date(leave.endDate);
      const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
      return targetTime >= startTime && targetTime <= endTime;
    });
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const fetchLeaves = async () => {
    setIsLoading(true);
    try {
      if (!token) return;
      const params: any = {};
      
      // If employee, only get their own leaves
      if (user?.roleName === 'EMPLOYEE' && user?.employee?.id) {
        params.employeeId = user.employee.id;
      }

      const res = await leavesAPI.getAll(params, token);
      const leaveList = Array.isArray(res) ? res : res.data || [];
      setLeaves(leaveList);
    } catch (error) {
      console.error('Failed to fetch leaves:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      if (!token) return;
      const res = await employeesAPI.getAll(token);
      setEmployees(Array.isArray(res) ? res : res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLeaves();
    if (user?.roleName !== 'EMPLOYEE') {
      fetchEmployees();
    }
  }, [token, user]);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setIsSubmitting(true);

    if (!startDate || !endDate || !reason) {
      setFormError('Please fill in all fields');
      setIsSubmitting(false);
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setFormError('Start date cannot be after end date');
      setIsSubmitting(false);
      return;
    }

    try {
      if (!token) return;
      await leavesAPI.apply({
        leaveType,
        startDate,
        endDate,
        reason
      }, token);

      setFormSuccess('Leave request applied successfully!');
      setStartDate('');
      setEndDate('');
      setReason('');
      setLeaveType('Sick');

      await fetchLeaves();
      setTimeout(() => {
        setShowApplyModal(false);
        setFormSuccess('');
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      if (!token) return;
      await leavesAPI.approve(id, token);
      await fetchLeaves();
    } catch (err) {
      console.error('Failed to approve leave', err);
    }
  };

  const handleReject = async (id: number) => {
    try {
      if (!token) return;
      await leavesAPI.reject(id, token);
      await fetchLeaves();
    } catch (err) {
      console.error('Failed to reject leave', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this leave request?')) return;
    try {
      if (!token) return;
      await leavesAPI.delete(id, token);
      await fetchLeaves();
    } catch (err) {
      console.error('Failed to delete leave', err);
    }
  };

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="flex items-center gap-1 w-fit bg-emerald-50 text-emerald-700 px-2.5 py-1 border border-emerald-100 rounded-full text-xs font-bold">
            <CheckCircle2 size={12} />
            Approved
          </span>
        );
      case 'Rejected':
        return (
          <span className="flex items-center gap-1 w-fit bg-rose-50 text-rose-700 px-2.5 py-1 border border-rose-100 rounded-full text-xs font-bold">
            <XCircle size={12} />
            Rejected
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 w-fit bg-amber-50 text-amber-700 px-2.5 py-1 border border-amber-100 rounded-full text-xs font-bold">
            <Clock size={12} />
            Pending Approval
          </span>
        );
    }
  };

  // Filter logic
  const filteredLeaves = leaves.filter(leave => {
    const matchesStatus = statusFilter === 'All' || leave.status === statusFilter;
    const matchesType = typeFilter === 'All' || leave.leaveType === typeFilter;

    // Direct reports check for managers
    if (user?.roleName === 'MANAGER') {
      const emp = employees.find(e => e.id === leave.employeeId);
      const isMyReport = emp?.managerId === user.id || leave.employee?.managerId === user.id;
      
      if (activeTab === 'my') {
        return leave.employee?.userId === user.id && matchesStatus && matchesType;
      } else if (activeTab === 'pending') {
        return isMyReport && leave.status === 'Applied' && matchesStatus && matchesType;
      } else {
        return (isMyReport || leave.employee?.userId === user.id) && matchesStatus && matchesType;
      }
    }

    if (user?.roleName === 'ADMIN' || user?.roleName === 'SUPER_ADMIN') {
      if (activeTab === 'my') {
        return leave.employee?.userId === user.id && matchesStatus && matchesType;
      } else if (activeTab === 'pending') {
        return leave.status === 'Applied' && matchesStatus && matchesType;
      } else {
        return matchesStatus && matchesType;
      }
    }

    return matchesStatus && matchesType;
  });

  const getLeaveStats = () => {
    const totals = leaves.filter(l => l.employee?.userId === user?.id);
    const approved = totals.filter(l => l.status === 'Approved').length;
    const pending = totals.filter(l => l.status === 'Applied').length;
    
    return {
      totalRequested: totals.length,
      approvedRequests: approved,
      pendingRequests: pending,
    };
  };

  const myStats = getLeaveStats();

  return (
    <div className="space-y-8 bg-slate-50 min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Leaves</h1>
          <p className="text-slate-500 mt-1">Manage corporate leave applications and requests</p>
        </div>
        <button
          onClick={() => setShowApplyModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition text-sm font-semibold shadow-sm cursor-pointer"
        >
          <Plus size={18} />
          Apply for Leave
        </button>
      </div>

      {/* Stats Cards (For My Leaves) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Total Applied</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{myStats.totalRequested}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg">
            <Calendar size={20} />
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Approved</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{myStats.approvedRequests}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg">
            <CheckCircle2 size={20} />
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Pending</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{myStats.pendingRequests}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg">
            <Clock size={20} />
          </div>
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Tabs */}
        {user?.roleName !== 'EMPLOYEE' ? (
          <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto">
            <button
              onClick={() => setActiveTab('my')}
              className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition ${
                activeTab === 'my'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-950'
              }`}
            >
              My Requests
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition ${
                activeTab === 'pending'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-950'
              }`}
            >
              Pending Approval
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-950'
              }`}
            >
              All Requests
            </button>
          </div>
        ) : (
          <div className="text-sm font-bold text-slate-700">My Leave Applications</div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 w-full sm:w-auto"
          >
            <option value="All">All Types</option>
            {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 w-full sm:w-auto"
          >
            <option value="All">All Statuses</option>
            <option value="Applied">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Calendar View"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-sm">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          Loading leave requests...
        </div>
      ) : viewMode === 'calendar' ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-fade-in">
          {/* Calendar Header with Controls */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="text-blue-600" />
              <span>
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 text-xs font-bold transition cursor-pointer"
              >
                Today
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition cursor-pointer"
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-xs font-extrabold text-slate-400 py-2 uppercase text-center">{d}</div>
            ))}
            {getDaysInMonth(currentDate).map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="bg-slate-50/40 border border-slate-100/30 rounded-xl aspect-square"></div>;
              
              const dayLeaves = getLeavesForDay(day);
              const hasLeave = dayLeaves.length > 0;
              const isToday = new Date().toDateString() === day.toDateString();
              
              return (
                <div 
                  key={day.toISOString()} 
                  className={`bg-white border rounded-xl aspect-square p-2 flex flex-col items-start justify-between hover:border-blue-400 transition min-h-[75px] ${
                    isToday ? 'ring-2 ring-blue-500/20 border-blue-500' : 'border-slate-200'
                  }`}
                >
                  <span className={`text-xs font-bold self-start ${
                    isToday ? 'text-blue-600 bg-blue-50 w-6 h-6 flex items-center justify-center rounded-full' : 'text-slate-700'
                  }`}>
                    {day.getDate()}
                  </span>
                  
                  {hasLeave && (
                    <div className="flex flex-col gap-1 w-full overflow-hidden mt-1">
                      {dayLeaves.slice(0, 2).map((l) => (
                        <div 
                          key={l.id} 
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate text-left w-full border ${
                            l.status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : l.status === 'Rejected'
                              ? 'bg-rose-50 text-rose-700 border-rose-100'
                              : 'bg-amber-50 text-amber-700 border-amber-100'
                          }`}
                          title={`${l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : 'System User'} (${l.leaveType}): ${l.reason}`}
                        >
                          {l.employee ? `${l.employee.firstName} ${l.employee.lastName[0]}.` : 'Leave'}
                        </div>
                      ))}
                      {dayLeaves.length > 2 && (
                        <span className="text-[8px] text-slate-400 font-extrabold text-center w-full block">+{dayLeaves.length - 2} more</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {filteredLeaves.length === 0 ? (
            <div className="p-16 text-center text-slate-500">
              <Calendar size={48} className="mx-auto mb-4 text-slate-300" />
              <p className="font-semibold text-slate-700 text-lg">No leave applications found</p>
              <p className="text-slate-400 mt-1 max-w-sm mx-auto">No leaves match the active filters or tab selection.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-extrabold tracking-wider">
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Leave Type</th>
                    <th className="px-6 py-4">Dates</th>
                    <th className="px-6 py-4">Reason</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Approver</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeaves.map((leave) => {
                    const empName = leave.employee
                      ? `${leave.employee.firstName} ${leave.employee.lastName}`
                      : 'System User';
                    const dateStr = `${new Date(leave.startDate).toLocaleDateString()} - ${new Date(leave.endDate).toLocaleDateString()}`;

                    return (
                      <tr key={leave.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          {empName}
                          {leave.employee?.department?.name && (
                            <span className="block text-[10px] text-slate-400 font-medium">
                              {leave.employee.department.name}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 border border-slate-200 rounded font-bold text-xs">
                            {leave.leaveType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-sm font-semibold">
                          {dateStr}
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-sm max-w-xs truncate" title={leave.reason}>
                          {leave.reason || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(leave.status)}
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-sm">
                          {leave.approver ? leave.approver.username : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {/* Approval Controls */}
                          {leave.status === 'Applied' && user?.roleName !== 'EMPLOYEE' && (
                            <div className="inline-flex gap-2">
                              <button
                                onClick={() => handleApprove(leave.id)}
                                className="px-2.5 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded-md text-xs font-bold transition cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(leave.id)}
                                className="px-2.5 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-md text-xs font-bold transition cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          )}

                          {/* Delete controls for employees who posted the request or admins */}
                          {(leave.status === 'Applied' || user?.roleName === 'SUPER_ADMIN') && (
                            <button
                              onClick={() => handleDelete(leave.id)}
                              className="ml-3 p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition cursor-pointer inline-block"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Calendar className="text-blue-600" /> Apply for Leave
            </h2>

            {formError && (
              <div className="p-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-2 mb-4">
                <AlertCircle size={14} />
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-2 mb-4">
                <CheckCircle2 size={14} />
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                >
                  {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reason</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain details..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg transition text-slate-600 font-bold text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-bold text-sm shadow-md cursor-pointer flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Submit Request'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
