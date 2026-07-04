'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { dsrAPI, projectsAPI } from '@/lib/api-client';
import { DSR, DSRStatus, Project } from '@/lib/types';
import { Plus, Edit2, Eye, CheckCircle, Clock, AlertCircle, X, FileText, Check, Ban, Send, BadgeAlert } from 'lucide-react';


export default function DSRPage() {
  const { user, token } = useAuth();
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

  // Form states (Create/Edit)
  const [projectId, setProjectId] = useState<number | ''>('');
  const [workDescription, setWorkDescription] = useState('');
  const [issues, setIssues] = useState('');
  const [tomorrowsPlan, setTomorrowsPlan] = useState('');
  const [completionPercentage, setCompletionPercentage] = useState(100);
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  
  // Review form states
  const [reviewComments, setReviewComments] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [formError, setFormError] = useState('');

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

  useEffect(() => {
    fetchDSRs();
    fetchProjects();
  }, [token, statusFilter, dateFilter]);

  const handleOpenViewModal = async (dsrId: number) => {
    setShowViewModal(true);
    setIsLoadingDetails(true);
    setReviewComments('');
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
    if (!projectId || !workDescription) {
      setFormError('Project and Work Description are required.');
      return;
    }

    try {
      await dsrAPI.create({
        projectId: Number(projectId),
        workDescription,
        issues,
        tomorrowsPlan,
        completionPercentage,
        priority,
        date: new Date()
      }, token || undefined);

      // Reset form & reload
      setProjectId('');
      setWorkDescription('');
      setIssues('');
      setTomorrowsPlan('');
      setCompletionPercentage(100);
      setPriority('Medium');
      setShowCreateModal(false);
      await fetchDSRs();
    } catch (error: any) {
      setFormError(error.message || 'Failed to submit status report');
    }
  };

  const handleApproveDsr = async () => {
    if (!selectedDsrDetails || !token) return;
    setIsReviewing(true);
    try {
      await dsrAPI.approve(selectedDsrDetails.id, reviewComments, token);
      setShowViewModal(false);
      await fetchDSRs();
    } catch (error: any) {
      setFormError(error.message || 'Failed to approve DSR');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleRejectDsr = async () => {
    if (!selectedDsrDetails || !token) return;
    setIsReviewing(true);
    try {
      await dsrAPI.reject(selectedDsrDetails.id, reviewComments, token);
      setShowViewModal(false);
      await fetchDSRs();
    } catch (error: any) {
      setFormError(error.message || 'Failed to reject DSR');
    } finally {
      setIsReviewing(false);
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
        {user?.roleName === 'EMPLOYEE' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-semibold shadow-md shadow-blue-600/10 cursor-pointer"
          >
            <Plus size={18} />
            New DSR
          </button>
        )}
      </div>

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
                className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-blue-500 disabled:opacity-50 font-bold"
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Total DSRs</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">{dsrRecords.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Approved Reports</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">
            {dsrRecords.filter(d => d.status === 'Approved').length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Pending Review</p>
          <p className="text-3xl font-bold text-amber-600 mt-2">
            {dsrRecords.filter(d => d.status === 'Submitted' || d.status === 'UnderReview').length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Drafts / Rejections</p>
          <p className="text-3xl font-bold text-slate-700 mt-2">
            {dsrRecords.filter(d => d.status === 'Draft' || d.status === 'Rejected').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block">Review Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-black text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block">Submission Date</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-black text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setStatusFilter('');
                setDateFilter('');
              }}
              className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition text-sm font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* DSR List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />
            Status Reports Directory
          </h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-500 animate-pulse font-medium">Loading DSRs...</div>
        ) : dsrRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <BadgeAlert size={40} className="mx-auto mb-3 text-slate-400" />
            <p className="font-semibold text-slate-700">No status reports found</p>
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
          <div className="divide-y divide-slate-100">
            {dsrRecords.map((dsr) => (
              <div key={dsr.id} className="p-5 hover:bg-slate-50/50 transition">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="font-bold text-slate-800 text-base">
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
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                          By: {dsr.employee.firstName} {dsr.employee.lastName}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                      <p><span className="font-bold">Project:</span> {dsr.project?.name || 'Internal / General'}</p>
                      <p><span className="font-bold">Priority:</span> {dsr.priority || 'Medium'}</p>
                      {dsr.reviewer && <p><span className="font-bold">Reviewer:</span> {dsr.reviewer.username}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenViewModal(dsr.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition text-xs font-bold cursor-pointer"
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

      {/* New DSR Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                Submit Daily Status Report (DSR)
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateDSR} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Project *</label>
                  <select
                    required
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Project</option>
                    {projects.map(proj => (
                      <option key={proj.id} value={proj.id}>{proj.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Priority *</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Work Done / Task Description *</label>
                <textarea
                  required
                  rows={4}
                  value={workDescription}
                  onChange={(e) => setWorkDescription(e.target.value)}
                  placeholder="Describe details of the tasks you completed today..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Tomorrow's Plan</label>
                <textarea
                  rows={2}
                  value={tomorrowsPlan}
                  onChange={(e) => setTomorrowsPlan(e.target.value)}
                  placeholder="Outline your targets for tomorrow..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Issues / Blockers (if any)</label>
                <textarea
                  rows={2}
                  value={issues}
                  onChange={(e) => setIssues(e.target.value)}
                  placeholder="List any blocker issues preventing completion..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Task Completion: {completionPercentage}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={completionPercentage}
                  onChange={(e) => setCompletionPercentage(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Submit buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition shadow-md shadow-blue-600/10 cursor-pointer"
                >
                  Save Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View DSR & Review Modal */}
      {showViewModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">
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

            <div className="p-6 space-y-6">
              {isLoadingDetails ? (
                <div className="py-8 text-center text-slate-500 animate-pulse font-medium">Fetching details...</div>
              ) : !selectedDsrDetails ? (
                <div className="py-8 text-center text-rose-500 font-medium">Failed to retrieve details.</div>
              ) : (
                <div className="space-y-6">
                  {/* Employee & Date info */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Submitted By</p>
                      <p className="font-bold text-slate-800 text-base">
                        {selectedDsrDetails.employee?.firstName} {selectedDsrDetails.employee?.lastName}
                      </p>
                      <p className="text-xs text-slate-500">{selectedDsrDetails.employee?.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Report Date</p>
                      <p className="font-bold text-slate-800 text-base">
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
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase">Associated Project</p>
                      <p className="text-sm font-semibold text-slate-800">{selectedDsrDetails.project?.name || 'General Work'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase">Completion Progress</p>
                      <p className="text-sm font-semibold text-slate-800">{selectedDsrDetails.completionPercentage}% Complete</p>
                    </div>
                  </div>

                  {/* Work description */}
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Work Completed Today</h4>
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                      {selectedDsrDetails.workDescription || 'No description provided.'}
                    </div>
                  </div>

                  {/* Tomorrows Plan */}
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Plan for Tomorrow</h4>
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                      {selectedDsrDetails.tomorrowsPlan || 'No plan outlined.'}
                    </div>
                  </div>

                  {/* Issues */}
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Issues & Blockers</h4>
                    <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-lg text-sm text-rose-800 whitespace-pre-line leading-relaxed">
                      {selectedDsrDetails.issues || 'No blockers reported.'}
                    </div>
                  </div>

                  {/* Review comments */}
                  {(selectedDsrDetails.reviewComments || selectedDsrDetails.reviewer) && (
                    <div className="border-t border-slate-100 pt-4 space-y-2">
                      <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Review Logs</h4>
                      <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg text-sm text-slate-800 leading-relaxed">
                        <p className="font-semibold text-blue-900 mb-1">
                          Reviewed By: {selectedDsrDetails.reviewer?.username || 'System'}
                        </p>
                        <p className="text-slate-600 italic">
                          &quot;{selectedDsrDetails.reviewComments || 'Approved without comments.'}&quot;
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Actions for Manager/Admin (Approve/Reject) */}
                  {(user?.roleName === 'MANAGER' || user?.roleName === 'ADMIN' || user?.roleName === 'SUPER_ADMIN') && 
                    (selectedDsrDetails.status === 'Submitted' || selectedDsrDetails.status === 'UnderReview') && (
                    <div className="border-t border-slate-200 pt-4 space-y-4">
                      {formError && (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded font-medium">
                          {formError}
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Review Comments</label>
                        <textarea
                          rows={2}
                          value={reviewComments}
                          onChange={(e) => setReviewComments(e.target.value)}
                          placeholder="Provide feedback, approval note, or reason for rejection..."
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="flex gap-2.5 justify-end">
                        <button
                          onClick={handleRejectDsr}
                          disabled={isReviewing}
                          className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          <Ban size={15} />
                          Reject Report
                        </button>
                        <button
                          onClick={handleApproveDsr}
                          disabled={isReviewing}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                        >
                          <Check size={15} />
                          Approve Report
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions for Draft DSR (Employee submits) */}
                  {user?.id === selectedDsrDetails.employee?.userId && selectedDsrDetails.status === 'Draft' && (
                    <div className="flex justify-end pt-4 border-t border-slate-100">
                      <button
                        onClick={() => handleSubmitDraftDsr(selectedDsrDetails.id)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                      >
                        <Send size={15} />
                        Submit Report for Review
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
