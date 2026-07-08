'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { dsrAPI, projectsAPI } from '@/lib/api-client';
import { DSR, DSRStatus, Project } from '@/lib/types';
import { Plus, Eye, CheckCircle, Clock, AlertCircle, X, FileText, Send, BadgeAlert, Calendar, Download, RefreshCw, BarChart } from 'lucide-react';

interface ReportStats {
  totalEmployees: number;
  totalManagers: number;
  totalHR: number;
  todaysSubmittedDSR: number;
  todaysMissingDSR: number;
  presentToday: number;
  absentToday: number;
  totalProjects: number;
}

interface MonthlyGridRow {
  id: number;
  employeeCode: string;
  name: string;
  role: string;
  department: string;
  totalWorkingDays: number;
  submittedDsrCount: number;
  missingDsrCount: number;
  presentCount: number;
  absentCount: number;
  days: { day: number; status: '✓' | '✗' | '-' }[];
}

export default function DSRPage() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'directory' | 'reports'>('directory');
  const [dsrRecords, setDsrRecords] = useState<DSR[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Timesheet Timer States
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActiveProject, setTimerActiveProject] = useState<number | ''>('');

  // Reports tab states
  const [selectedMonth, setSelectedMonth] = useState('2026-07');
  const [reportStats, setReportStats] = useState<ReportStats | null>(null);
  const [monthlyGrid, setMonthlyGrid] = useState<{ daysInMonth: number; rows: MonthlyGridRow[] } | null>(null);
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    let interval: any;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const startTimer = () => {
    if (!timerActiveProject) return;
    setTimerRunning(true);
  };

  const stopTimer = () => {
    setTimerRunning(false);
    const hrs = (timerSeconds / 3600).toFixed(2);
    setProjectId(timerActiveProject);
    setHoursWorked(parseFloat(hrs));
    setTaskTitle('Logged from active timer');
    setModule('Time Tracker');
    setWorkDescription(`Timesheet Timer Logged: ${hrs} hours spent on active implementation, code refactoring, and integration testing.`);
    setShowCreateModal(true);
    setTimerSeconds(0);
  };

  const formatTimerTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSecs % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDsrDetails, setSelectedDsrDetails] = useState<DSR | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Form states (Create/Edit DSR)
  const [projectId, setProjectId] = useState<number | ''>('');
  const [customProjectName, setCustomProjectName] = useState('');
  const [isCustomProject, setIsCustomProject] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [module, setModule] = useState('');
  const [hoursWorked, setHoursWorked] = useState<number | ''>('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [issues, setIssues] = useState('');
  const [tomorrowsPlan, setTomorrowsPlan] = useState('');
  const [completionPercentage, setCompletionPercentage] = useState(100);
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [remarks, setRemarks] = useState('');
  
  const [formError, setFormError] = useState('');
  const [isSubmittingDirectly, setIsSubmittingDirectly] = useState(false);

  const fetchDSRs = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (dateFilter) {
        params.startDate = dateFilter;
        params.endDate = dateFilter;
      }

      const response = await dsrAPI.getAll(params, token);
      setDsrRecords(response.data || []);
    } catch (error) {
      console.error('Failed to fetch DSRs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async () => {
    if (!token) return;
    try {
      const response = await projectsAPI.getAll({}, token);
      setProjects(response.data || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const fetchReportsData = async () => {
    if (activeTab !== 'reports' || !token) return;
    setLoadingReports(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
      
      // Fetch stats
      const statsRes = await fetch(`${API_BASE}/dsr/reports/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setReportStats(statsData);
      }

      // Fetch grid
      const gridRes = await fetch(`${API_BASE}/dsr/reports/monthly-grid?month=${selectedMonth}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (gridRes.ok) {
        const gridData = await gridRes.json();
        setMonthlyGrid(gridData);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchDSRs();
    fetchProjects();
  }, [token, statusFilter, dateFilter]);

  useEffect(() => {
    fetchReportsData();
  }, [token, activeTab, selectedMonth]);

  const handleOpenViewModal = async (dsrId: number) => {
    setShowViewModal(true);
    setIsLoadingDetails(true);
    setFormError('');
    try {
      const details = await dsrAPI.getById(dsrId, token || undefined);
      setSelectedDsrDetails(details);
    } catch (error) {
      console.error('Failed to load DSR details:', error);
      setSelectedDsrDetails(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCreateDSR = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!isCustomProject && !projectId) {
      setFormError('Please select a project or type custom project name.');
      return;
    }
    if (isCustomProject && !customProjectName) {
      setFormError('Please type a custom project name.');
      return;
    }
    if (!workDescription) {
      setFormError('Work Description is required.');
      return;
    }

    try {
      await dsrAPI.create({
        projectId: isCustomProject ? null : Number(projectId),
        customProjectName: isCustomProject ? customProjectName : null,
        taskTitle,
        module,
        hoursWorked: hoursWorked ? Number(hoursWorked) : null,
        startTime: startTime || null,
        endTime: endTime || null,
        workDescription,
        issues,
        tomorrowsPlan,
        completionPercentage,
        priority,
        remarks,
        status: isSubmittingDirectly ? 'Submitted' : 'Draft',
        date: new Date()
      }, token || undefined);

      // Reset form & reload
      setProjectId('');
      setCustomProjectName('');
      setIsCustomProject(false);
      setTaskTitle('');
      setModule('');
      setHoursWorked('');
      setStartTime('');
      setEndTime('');
      setWorkDescription('');
      setIssues('');
      setTomorrowsPlan('');
      setCompletionPercentage(100);
      setPriority('Medium');
      setRemarks('');
      setShowCreateModal(false);
      await fetchDSRs();
    } catch (error: any) {
      setFormError(error.message || 'Failed to submit status report');
    }
  };

  const handleSubmitDraftDsr = async (dsrId: number) => {
    if (!token) return;
    try {
      await dsrAPI.submit(dsrId, token);
      await fetchDSRs();
      if (selectedDsrDetails && selectedDsrDetails.id === dsrId) {
        setShowViewModal(false);
      }
    } catch (error) {
      console.error('Failed to submit DSR:', error);
    }
  };

  const handleExport = (type: string, format: string) => {
    if (!token) return;
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
    const downloadUrl = `${API_BASE}/dsr/reports/export?type=${type}&format=${format}&date=${dateFilter || new Date().toISOString()}&token=${token}`;
    
    // Open in a new tab or trigger directly
    window.open(downloadUrl, '_blank');
  };

  const getStatusIcon = (status: DSRStatus) => {
    switch (status) {
      case 'Approved':
      case 'Submitted':
        return <CheckCircle size={14} className="text-emerald-600" />;
      case 'Rejected':
        return <AlertCircle size={14} className="text-rose-600" />;
      default:
        return <Clock size={14} className="text-amber-600" />;
    }
  };

  const getStatusBg = (status: DSRStatus) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Submitted':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-6 dark:bg-slate-950 dark:text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 font-sans">Daily Status Reports</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Submit and track employee progress reports</p>
        </div>
        
        {/* New DSR button for all active users: Employee, Manager, HR/Admin */}
        {(user?.roleName === 'EMPLOYEE' || user?.roleName === 'MANAGER' || user?.roleName === 'HR' || user?.roleName === 'ADMIN') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-semibold shadow-md shadow-blue-600/10 cursor-pointer"
          >
            <Plus size={18} />
            New DSR
          </button>
        )}
      </div>

      {/* Tabs Switcher for Super Admin */}
      {user?.roleName === 'SUPER_ADMIN' && (
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex-1 lg:flex-none px-6 py-2.5 text-sm font-bold rounded-md transition duration-200 cursor-pointer ${
              activeTab === 'directory'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            DSR Directory
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 lg:flex-none px-6 py-2.5 text-sm font-bold rounded-md transition duration-200 cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Reports & Analytics
          </button>
        </div>
      )}

      {activeTab === 'directory' ? (
        <>
          {/* Timesheet Tracking Timer Widget (Only for EMPLOYEES to submit logs) */}
          {user?.roleName === 'EMPLOYEE' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 dark:bg-slate-900 dark:border-slate-800">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full inline-block ${timerRunning ? 'bg-red-500 animate-ping' : 'bg-slate-400'}`} />
                  Active Timesheet Tracker
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Record your tasks execution live and push to your Daily Status Report (DSR) upon completion
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <select
                    disabled={timerRunning}
                    value={timerActiveProject}
                    onChange={(e) => setTimerActiveProject(Number(e.target.value) || '')}
                    className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-850 dark:text-slate-200 text-xs focus:outline-none focus:border-blue-500 disabled:opacity-50 font-bold"
                  >
                    <option value="">Select Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="font-mono text-2xl font-black text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-950 px-4 py-1.5 rounded-lg border dark:border-slate-850">
                  {formatTimerTime(timerSeconds)}
                </div>

                <div className="flex gap-2">
                  {!timerRunning ? (
                    <button
                      onClick={startTimer}
                      disabled={!timerActiveProject}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-55 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
                    >
                      Start Timer
                    </button>
                  ) : (
                    <button
                      onClick={stopTimer}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
                    >
                      Stop & Log DSR
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Directory Filters */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Review Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-black dark:text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Submitted">Submitted</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Submission Date</label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-black dark:text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setStatusFilter('');
                    setDateFilter('');
                  }}
                  className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition text-sm font-semibold cursor-pointer dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>

          {/* DSR Directory Directory List */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <h2 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                Status Reports Directory
              </h2>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-slate-500 animate-pulse font-medium">Loading DSRs...</div>
            ) : dsrRecords.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <BadgeAlert size={40} className="mx-auto mb-3 text-slate-400" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No status reports found</p>
                {user?.roleName === 'EMPLOYEE' && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-bold mt-1 cursor-pointer"
                  >
                    Create your first DSR
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {dsrRecords.map((dsr) => (
                  <div key={dsr.id} className="p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">
                            {new Date(dsr.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </h3>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${getStatusBg(dsr.status)}`}>
                            {getStatusIcon(dsr.status)}
                            {dsr.status}
                          </span>
                          {dsr.employee && (
                            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-medium">
                              By: {dsr.employee.firstName} {dsr.employee.lastName}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          <p><span className="font-bold">Project:</span> {dsr.project?.name || dsr.customProjectName || 'Internal / General'}</p>
                          <p><span className="font-bold">Hours:</span> {dsr.hoursWorked || '0'} hrs</p>
                          <p><span className="font-bold">Task:</span> {dsr.taskTitle || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenViewModal(dsr.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-850 dark:text-slate-200 dark:hover:bg-slate-800 rounded-lg transition text-xs font-bold cursor-pointer"
                          title="View Details"
                        >
                          <Eye size={15} />
                          View Details
                        </button>
                        {dsr.status === 'Draft' && user?.id === dsr.employee?.userId && (
                          <button
                            onClick={() => handleSubmitDraftDsr(dsr.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-xs font-bold cursor-pointer"
                            title="Submit report"
                          >
                            <Send size={15} />
                            Submit
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Super Admin Reports & Analytics Dashboard */
        <div className="space-y-6">
          {/* Month Selector and Export Controls */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Select Month:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-black dark:text-slate-100 text-sm focus:outline-none focus:border-blue-500 font-bold"
              />
            </div>

            {/* Export buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleExport('daily', 'excel')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <Download size={14} /> Export Daily (XLS)
              </button>
              <button
                onClick={() => handleExport('monthly', 'excel')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <Download size={14} /> Export Monthly (XLS)
              </button>
              <button
                onClick={() => handleExport('monthly', 'csv')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <Download size={14} /> Export CSV
              </button>
              <button
                onClick={() => handleExport('monthly', 'pdf')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <Download size={14} /> Export PDF
              </button>
            </div>
          </div>

          {/* Super Admin Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Employees</p>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">{reportStats?.totalEmployees || 0}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Managers</p>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">{reportStats?.totalManagers || 0}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total HR staff</p>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">{reportStats?.totalHR || 0}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Submitted DSRs</p>
              <p className="text-3xl font-black text-blue-600 mt-2">{reportStats?.todaysSubmittedDSR || 0}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Missing DSRs</p>
              <p className="text-3xl font-black text-rose-600 mt-2">{reportStats?.todaysMissingDSR || 0}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Present Today</p>
              <p className="text-3xl font-black text-emerald-600 mt-2">{reportStats?.presentToday || 0}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Absent Today</p>
              <p className="text-3xl font-black text-rose-500 mt-2">{reportStats?.absentToday || 0}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Active Projects</p>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">{reportStats?.totalProjects || 0}</p>
            </div>
          </div>

          {/* Monthly Attendance & DSR Submission Grid View */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart size={18} className="text-blue-600" />
                Monthly Submissions Ledger Matrix
              </h3>
            </div>

            {loadingReports ? (
              <div className="p-12 text-center text-slate-500 animate-pulse font-medium">Re-compiling submission matrices...</div>
            ) : !monthlyGrid || monthlyGrid.rows.length === 0 ? (
              <div className="p-12 text-center text-slate-500">No logs logged for this month scope.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-950 font-extrabold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                      <th className="p-3 border-r dark:border-slate-800 whitespace-nowrap sticky left-0 bg-slate-100 dark:bg-slate-950 z-10">Employee Name</th>
                      <th className="p-3 border-r dark:border-slate-800 text-center">Work Days</th>
                      <th className="p-3 border-r dark:border-slate-800 text-center">DSRs</th>
                      <th className="p-3 border-r dark:border-slate-800 text-center">Missing</th>
                      <th className="p-3 border-r dark:border-slate-800 text-center">Present</th>
                      <th className="p-3 border-r dark:border-slate-800 text-center">Absent</th>
                      {Array.from({ length: monthlyGrid.daysInMonth }).map((_, idx) => (
                        <th key={idx} className="p-1.5 text-center border-r dark:border-slate-800 min-w-8">{idx + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80">
                    {monthlyGrid.rows.map(row => (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="p-3 border-r dark:border-slate-800 font-bold text-slate-900 dark:text-slate-200 whitespace-nowrap sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                          {row.name}
                          <p className="text-[10px] text-slate-400 font-semibold">{row.employeeCode}</p>
                        </td>
                        <td className="p-3 border-r dark:border-slate-800 text-center font-bold">{row.totalWorkingDays}</td>
                        <td className="p-3 border-r dark:border-slate-800 text-center text-emerald-600 font-bold">{row.submittedDsrCount}</td>
                        <td className="p-3 border-r dark:border-slate-800 text-center text-rose-500 font-bold">{row.missingDsrCount}</td>
                        <td className="p-3 border-r dark:border-slate-800 text-center text-emerald-600 font-bold">{row.presentCount}</td>
                        <td className="p-3 border-r dark:border-slate-800 text-center text-rose-500 font-bold">{row.absentCount}</td>
                        {row.days.map((day, idx) => {
                          const isMissing = day.status === '✗';
                          const isSuccess = day.status === '✓';
                          return (
                            <td
                              key={idx}
                              className={`p-1.5 text-center border-r dark:border-slate-800 font-black ${
                                isMissing
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400'
                                  : isSuccess
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {day.status}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New DSR Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-850 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                Submit Daily Status Report (DSR)
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateDSR} className="p-6 space-y-4 text-left">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
                  {formError}
                </div>
              )}

              {/* Restrict Project drop-down or allow custom typing */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Project *</label>
                {!isCustomProject ? (
                  <div className="flex gap-2">
                    <select
                      required
                      value={projectId}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setIsCustomProject(true);
                          setProjectId('');
                        } else {
                          setProjectId(e.target.value === '' ? '' : Number(e.target.value));
                          setCustomProjectName('');
                        }
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-black dark:text-slate-100 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select Project</option>
                      {projects.map(proj => (
                        <option key={proj.id} value={proj.id}>{proj.name}</option>
                      ))}
                      <option value="custom" className="text-blue-600 font-bold dark:text-blue-400">+ Type Custom Project Name</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      required
                      placeholder="Enter custom project name..."
                      value={customProjectName}
                      onChange={(e) => setCustomProjectName(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-black dark:text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomProject(false);
                        setCustomProjectName('');
                      }}
                      className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Task Title & Module */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Task Title *</label>
                  <input
                    type="text"
                    required
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Enter task name"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-black dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Module</label>
                  <input
                    type="text"
                    value={module}
                    onChange={(e) => setModule(e.target.value)}
                    placeholder="e.g. Auth, Payment"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-black dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Hours worked and start/end times */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Hours Worked *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="24"
                    required
                    value={hoursWorked}
                    onChange={(e) => setHoursWorked(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Hours (e.g. 8)"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-black dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-black dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-black dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Priority and Completion */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Priority *</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-black dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Task Completion: {completionPercentage}%</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={completionPercentage}
                    onChange={(e) => setCompletionPercentage(Number(e.target.value))}
                    className="w-full h-2 mt-4 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>

              {/* Work done description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Work Done / Task Description *</label>
                <textarea
                  required
                  rows={3}
                  value={workDescription}
                  onChange={(e) => setWorkDescription(e.target.value)}
                  placeholder="Describe details of the tasks you completed today..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-black dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tomorrow's Plan</label>
                  <textarea
                    rows={1.5}
                    value={tomorrowsPlan}
                    onChange={(e) => setTomorrowsPlan(e.target.value)}
                    placeholder="Outline targets for tomorrow..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-black dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Issues / Blockers</label>
                  <textarea
                    rows={1.5}
                    value={issues}
                    onChange={(e) => setIssues(e.target.value)}
                    placeholder="Blockers preventing completion..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-black dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Remarks/Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Remarks / Employee Comments</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Any final notes, reasons for overtime, etc..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-black dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Submit buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={() => setIsSubmittingDirectly(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold transition cursor-pointer"
                >
                  Save Draft
                </button>
                <button
                  type="submit"
                  onClick={() => setIsSubmittingDirectly(true)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition shadow-md shadow-blue-600/10 cursor-pointer"
                >
                  Submit DSR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View DSR Modal */}
      {showViewModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-850 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Daily Status Report Details
              </h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedDsrDetails(null);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 text-left">
              {isLoadingDetails ? (
                <div className="py-8 text-center text-slate-500 animate-pulse font-medium">Fetching details...</div>
              ) : !selectedDsrDetails ? (
                <div className="py-8 text-center text-rose-500 font-medium">Failed to retrieve details.</div>
              ) : (
                <div className="space-y-6">
                  {/* Employee & Date info */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Submitted By</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-base">
                        {selectedDsrDetails.employee?.firstName} {selectedDsrDetails.employee?.lastName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{selectedDsrDetails.employee?.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Report Date</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-base">
                        {new Date(selectedDsrDetails.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-bold mt-1 ${getStatusBg(selectedDsrDetails.status)}`}>
                        {getStatusIcon(selectedDsrDetails.status)}
                        {selectedDsrDetails.status}
                      </span>
                    </div>
                  </div>

                  {/* Core Status details */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-850">
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase">Associated Project</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{selectedDsrDetails.project?.name || selectedDsrDetails.customProjectName || 'General Work'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase">Completion Progress</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{selectedDsrDetails.completionPercentage}% Complete</p>
                    </div>
                  </div>

                  {/* Task details */}
                  <div className="grid grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-850">
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase">Task Title</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{selectedDsrDetails.taskTitle || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase">Module</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{selectedDsrDetails.module || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase">Hours Logged</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{selectedDsrDetails.hoursWorked || '0.00'} hours</p>
                    </div>
                  </div>

                  {/* Work description */}
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Work Completed Today</h4>
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-lg text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                      {selectedDsrDetails.workDescription || 'No description provided.'}
                    </div>
                  </div>

                  {/* Tomorrows Plan */}
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Plan for Tomorrow</h4>
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-lg text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                      {selectedDsrDetails.tomorrowsPlan || 'No plan outlined.'}
                    </div>
                  </div>

                  {/* Remarks / Comments */}
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Remarks / Employee Comments</h4>
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-lg text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                      {selectedDsrDetails.remarks || 'No remarks provided.'}
                    </div>
                  </div>

                  {/* Issues */}
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Issues & Blockers</h4>
                    <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-lg text-sm text-rose-800 whitespace-pre-line leading-relaxed">
                      {selectedDsrDetails.issues || 'No blockers reported.'}
                    </div>
                  </div>

                  {/* Actions for Draft DSR (Employee submits) */}
                  {user?.id === selectedDsrDetails.employee?.userId && selectedDsrDetails.status === 'Draft' && (
                    <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => handleSubmitDraftDsr(selectedDsrDetails.id)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                      >
                        <Send size={15} />
                        Submit Report
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
