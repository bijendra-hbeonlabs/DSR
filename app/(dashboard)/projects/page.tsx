'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { projectsAPI, employeesAPI } from '@/lib/api-client';
import { Project, ProjectStatus, Employee } from '@/lib/types';
import { Plus, Edit2, Trash2, Eye, Users, Calendar, X, Briefcase, PlusCircle, CheckCircle } from 'lucide-react';

const DEPARTMENTS = [
  { id: 1, name: 'Engineering' },
  { id: 2, name: 'Design' },
  { id: 3, name: 'Sales' },
  { id: 4, name: 'HR' },
  { id: 5, name: 'Finance' }
];
const parseProjectDescription = (desc: string | null) => {
  if (!desc) return { description: '', code: 'N/A', client: 'N/A', budget: '0', priority: 'Medium', risk: 'Low' };
  
  // Match key-value headers in the string
  const codeMatch = desc.match(/^Project Code:\s*(.*)$/m);
  const clientMatch = desc.match(/^Client:\s*(.*)$/m);
  const budgetMatch = desc.match(/^Estimated Budget:\s*\$?(.*)$/m);
  const priorityMatch = desc.match(/^Priority:\s*(.*)$/m);
  const riskMatch = desc.match(/^Risk Level:\s*(.*)$/m);
  const objectivesIndex = desc.indexOf('Objectives & Scope:');
  
  if (codeMatch || clientMatch || budgetMatch) {
    return {
      code: codeMatch ? codeMatch[1].trim() : 'N/A',
      client: clientMatch ? clientMatch[1].trim() : 'N/A',
      budget: budgetMatch ? budgetMatch[1].trim() : '0',
      priority: priorityMatch ? priorityMatch[1].trim() : 'Medium',
      risk: riskMatch ? riskMatch[1].trim() : 'Low',
      description: objectivesIndex !== -1 ? desc.substring(objectivesIndex + 'Objectives & Scope:'.length).trim() : desc
    };
  }
  
  return {
    code: 'N/A',
    client: 'N/A',
    budget: '0',
    priority: 'Medium',
    risk: 'Low',
    description: desc
  };
};

export default function ProjectsPage() {
  const { user, token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showGanttView, setShowGanttView] = useState(false);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProjectDetails, setSelectedProjectDetails] = useState<Project | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<number | null>(null);

  // Form states (Create Project)
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [createStatus, setCreateStatus] = useState<ProjectStatus>('Planning');
  const [createProgress, setCreateProgress] = useState(0);
  const [createTeamLeadId, setCreateTeamLeadId] = useState<number | ''>('');
  const [projectCode, setProjectCode] = useState('');
  const [clientName, setClientName] = useState('');
  const [estimatedBudget, setEstimatedBudget] = useState('');
  const [projectPriority, setProjectPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [riskLevel, setRiskLevel] = useState<'Low' | 'Medium' | 'High'>('Low');
  const [formError, setFormError] = useState('');

  // Form states (Edit Project Details)
  const [editStatus, setEditStatus] = useState<ProjectStatus>('Planning');
  const [editProgress, setEditProgress] = useState(0);

  // Form states (Add Project Member)
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [memberRole, setMemberRole] = useState<'Lead' | 'Member'>('Member');
  const [memberError, setMemberError] = useState('');
  const [memberSuccess, setMemberSuccess] = useState('');

  const fetchProjects = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;

      const response = await projectsAPI.getAll(params, token);
      setProjects(response.data || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (!token) return;
    try {
      const response = await employeesAPI.getAll(token);
      const data = Array.isArray(response) ? response : response.data || response.employees || [];
      setEmployees(data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchEmployees();
  }, [token, statusFilter]);

  const handleOpenDetails = async (id: number) => {
    setShowDetailsModal(true);
    setIsLoadingDetails(true);
    setMemberError('');
    setMemberSuccess('');
    setSelectedUserId('');
    try {
      const details = await projectsAPI.getById(id, token || undefined);
      setSelectedProjectDetails(details);
      setEditStatus(details.status);
      setEditProgress(details.progress || 0);
    } catch (error) {
      console.error('Failed to load project details:', error);
      setSelectedProjectDetails(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!name) {
      setFormError('Project name is required');
      return;
    }

    try {
      const formattedDescription = `Project Code: ${projectCode || 'N/A'}
Client: ${clientName || 'N/A'}
Estimated Budget: $${estimatedBudget || '0'}
Priority: ${projectPriority}
Risk Level: ${riskLevel}

Objectives & Scope:
${description}`;

      await projectsAPI.create({
        name,
        description: formattedDescription,
        departmentId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status: createStatus,
        progress: createProgress,
        teamLeadId: createTeamLeadId ? Number(createTeamLeadId) : undefined,
      }, token || undefined);

      setName('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setCreateStatus('Planning');
      setCreateProgress(0);
      setCreateTeamLeadId('');
      setProjectCode('');
      setClientName('');
      setEstimatedBudget('');
      setProjectPriority('Medium');
      setRiskLevel('Low');
      setShowCreateModal(false);
      await fetchProjects();
    } catch (error: any) {
      setFormError(error.message || 'Failed to create project');
    }
  };

  const handleUpdateProjectStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectDetails) return;

    try {
      await projectsAPI.update(selectedProjectDetails.id, {
        status: editStatus,
        progress: editProgress
      }, token || undefined);
      
      // Reload details and list
      await handleOpenDetails(selectedProjectDetails.id);
      await fetchProjects();
    } catch (error) {
      console.error('Failed to update project status:', error);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberError('');
    setMemberSuccess('');
    if (!selectedProjectDetails || !selectedUserId) {
      setMemberError('Please select a team member');
      return;
    }

    try {
      await projectsAPI.addMember(
        selectedProjectDetails.id,
        Number(selectedUserId),
        memberRole,
        token || undefined
      );

      setMemberSuccess('Team member assigned successfully!');
      setSelectedUserId('');
      // Reload project details to show updated member list
      await handleOpenDetails(selectedProjectDetails.id);
    } catch (error: any) {
      setMemberError(error.message || 'Failed to assign team member');
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    try {
      await projectsAPI.delete(id, token);
      setProjects(projects.filter(project => project.id !== id));
      setShowDeleteModal(null);
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'Active':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">Active</span>;
      case 'Completed':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-full">Completed</span>;
      case 'OnHold':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-full">On Hold</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">Planning</span>;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-emerald-500';
    if (progress >= 55) return 'bg-blue-500';
    if (progress >= 30) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500 mt-2">Manage and assign corporate projects</p>
        </div>
        {(user?.roleName === 'SUPER_ADMIN' || user?.roleName === 'ADMIN' || user?.roleName === 'MANAGER' || user?.roleName === 'EMPLOYEE') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-semibold shadow-md shadow-blue-600/10 cursor-pointer"
          >
            <Plus size={18} />
            New Project
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Total Projects</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">{projects.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Active Projects</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">
            {projects.filter(p => p.status === 'Active').length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">In Planning</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {projects.filter(p => p.status === 'Planning').length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">On Hold / Completed</p>
          <p className="text-3xl font-bold text-slate-700 mt-2">
            {projects.filter(p => p.status === 'OnHold' || p.status === 'Completed').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between gap-4 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-black dark:text-slate-200 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="Planning">Planning</option>
            <option value="Active">Active</option>
            <option value="OnHold">On Hold</option>
            <option value="Completed">Completed</option>
          </select>
          <button
            onClick={() => setStatusFilter('')}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition text-sm font-semibold cursor-pointer dark:bg-slate-850 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Reset
          </button>
        </div>

        <div>
          <button
            onClick={() => setShowGanttView(!showGanttView)}
            className={`px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 dark:border-slate-850 ${
              showGanttView ? 'bg-blue-600 border-blue-600 text-white font-bold' : 'bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-200'
            }`}
          >
            <Calendar size={15} />
            <span>{showGanttView ? 'Show Card Grid' : 'Show Gantt Timeline'}</span>
          </button>
        </div>
      </div>

      {/* Projects Grid / Gantt Chart */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500 animate-pulse font-medium">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <Users size={48} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">No projects found</h3>
          <p className="text-sm text-slate-500 mt-1">Get started by creating a project profile.</p>
        </div>
      ) : showGanttView ? (
        /* Gantt View Section */
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b pb-3 dark:border-slate-850">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Briefcase size={18} className="text-blue-500" />
              Project Execution Gantt Chart (2026 Timeline)
            </h3>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Monthly Scaled Indicators</span>
          </div>

          <div className="space-y-6">
            {/* Timeline Header */}
            <div className="grid grid-cols-12 gap-2 text-center text-[10px] font-black text-slate-500 dark:text-slate-400 border-b pb-2 dark:border-slate-800">
              <div className="col-span-3 text-left">Project Name / Details</div>
              <div>Jan</div>
              <div>Feb</div>
              <div>Mar</div>
              <div>Apr</div>
              <div>May</div>
              <div>Jun</div>
              <div>Jul</div>
              <div>Aug</div>
              <div>Sep</div>
              <div>Oct</div>
              <div>Nov</div>
              <div>Dec</div>
            </div>

            {/* Project Timeline Rows */}
            {projects.map((project) => {
              const startMonth = project.startDate ? new Date(project.startDate).getMonth() : 0;
              const endMonth = project.endDate ? new Date(project.endDate).getMonth() : 11;
              const span = Math.max(1, endMonth - startMonth + 1);

              return (
                <div key={project.id} className="grid grid-cols-12 gap-2 items-center text-xs border-b border-slate-100 dark:border-slate-850 pb-4 last:border-b-0">
                  <div className="col-span-3 text-left">
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{project.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Status: {project.status}</p>
                  </div>

                  <div className="col-span-9 relative h-8 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-850">
                    <div
                      className="absolute top-1 bottom-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-md shadow-sm border border-blue-400/30 flex items-center justify-between px-3 text-[10px] text-white font-bold transition-all duration-300"
                      style={{
                        left: `${(startMonth / 12) * 100}%`,
                        width: `${(span / 12) * 100}%`
                      }}
                    >
                      <span className="truncate">{project.progress || 0}% Done</span>
                      <span className="hidden sm:inline font-mono">({span} Mo)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const parsed = parseProjectDescription(project.description);
            return (
              <div key={project.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg line-clamp-2">{project.name}</h3>
                      <div className="flex items-center gap-2 mt-1 text-[11px] font-bold text-slate-500">
                        <span>Code: {parsed.code}</span>
                        <span>•</span>
                        <span>Client: {parsed.client}</span>
                      </div>
                    </div>
                    {getStatusBadge(project.status)}
                  </div>
                  <p className="text-xs font-semibold text-slate-500 line-clamp-3 leading-relaxed">
                    {parsed.description || 'No objectives provided.'}
                  </p>
                </div>

                {/* Progress and dates */}
                <div className="p-6 space-y-4 flex-1">
                  {/* Progress bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-bold text-slate-500">Overall Progress</p>
                      <p className="text-xs font-bold text-slate-800">{project.progress || 0}%</p>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressColor(project.progress || 0)} transition-all`}
                        style={{ width: `${project.progress || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Priority & Lead info */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-slate-400" />
                      <span>Lead: {project.teamLead?.username || 'Unassigned'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-medium">Priority:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        parsed.priority === 'Critical' ? 'bg-red-50 text-red-600 border-red-200' :
                        parsed.priority === 'High' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                        parsed.priority === 'Medium' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {parsed.priority}
                      </span>
                    </div>
                  </div>

                  {/* Dates */}
                  {(project.startDate || project.endDate) && (
                    <div className="space-y-1.5 text-xs text-slate-500 font-semibold pt-1 border-t border-slate-100">
                      {project.startDate && (
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-400" />
                          <span>Start: {new Date(project.startDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {project.endDate && (
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-400" />
                          <span>End: {new Date(project.endDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              {/* Action Buttons */}
              <div className="border-t border-slate-100 bg-slate-50/50 p-4 flex gap-2">
                <button
                  onClick={() => handleOpenDetails(project.id)}
                  className="flex-1 text-center py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition cursor-pointer"
                >
                  <Eye size={15} className="inline mr-1" />
                  View details
                </button>
                {(user?.roleName === 'SUPER_ADMIN' || user?.roleName === 'ADMIN' || user?.roleName === 'MANAGER') && (
                  <button
                    onClick={() => setShowDeleteModal(project.id)}
                    className="p-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-lg transition cursor-pointer"
                    title="Delete Project"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* New Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Briefcase size={20} className="text-blue-600" />
                Initialize New Project Profile
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
                  {formError}
                </div>
              )}

              {/* Row 1: Name and Department */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Project Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Project Optimization"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                  />
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
              </div>

              {/* Row 2: Project Code, Client Name, and Est. Budget */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Project Reference Code</label>
                  <input
                    type="text"
                    value={projectCode}
                    onChange={(e) => setProjectCode(e.target.value)}
                    placeholder="e.g. PRJ-2026-X"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Client / Sponsor</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Estimated Budget ($)</label>
                  <input
                    type="number"
                    value={estimatedBudget}
                    onChange={(e) => setEstimatedBudget(e.target.value)}
                    placeholder="e.g. 75000"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 3: Project Status, Progress, and Assign Team Lead */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Project Status</label>
                  <select
                    value={createStatus}
                    onChange={(e) => setCreateStatus(e.target.value as ProjectStatus)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                  >
                    <option value="Planning">Planning</option>
                    <option value="Active">Active</option>
                    <option value="OnHold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 font-semibold text-slate-800">Project Progress: {createProgress}%</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={createProgress}
                    onChange={(e) => setCreateProgress(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mt-2.5"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Assign Team Lead</label>
                  <select
                    value={createTeamLeadId}
                    onChange={(e) => setCreateTeamLeadId(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.userId}>
                        {emp.firstName} {emp.lastName} ({emp.user?.username})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Priority, Risk, Start Date, and End Date */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Priority Level</label>
                  <select
                    value={projectPriority}
                    onChange={(e) => setProjectPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Risk Assessment</label>
                  <select
                    value={riskLevel}
                    onChange={(e) => setRiskLevel(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 5: Detailed Objectives & Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Project Objectives & Description</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Outline core objectives, milestones, deliverables, or project dependencies..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Submit Buttons */}
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
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Details and Team Member Assignment Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900">
                Project Dashboard & Team Setup
              </h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedProjectDetails(null);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {isLoadingDetails ? (
                <div className="py-8 text-center text-slate-500 animate-pulse font-medium">Fetching detailed metrics...</div>
              ) : !selectedProjectDetails ? (
                <div className="py-8 text-center text-rose-500 font-medium font-semibold">Failed to load details.</div>
              ) : (
                <div className="space-y-6">
                  {/* Basic Project Info */}
                  {(() => {
                    const parsed = parseProjectDescription(selectedProjectDetails.description);
                    return (
                      <div className="border-b border-slate-100 pb-4 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-2xl font-bold text-slate-900">{selectedProjectDetails.name}</h3>
                            <div className="flex items-center gap-3 mt-1.5 text-xs font-bold text-slate-500">
                              <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Ref Code: {parsed.code}</span>
                              <span>•</span>
                              <span>Client: {parsed.client}</span>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block font-semibold">Estimated Budget</span>
                            <span className="text-sm font-extrabold text-blue-600 bg-blue-50 border border-blue-100 rounded px-2.5 py-0.5">${parsed.budget}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs font-semibold text-slate-600">
                          <div>
                            <span className="text-slate-400 font-bold block mb-0.5">PRIORITY LEVEL</span>
                            <span className={`px-2.5 py-0.5 rounded font-bold border ${
                              parsed.priority === 'Critical' ? 'bg-red-50 text-red-600 border-red-200' :
                              parsed.priority === 'High' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                              parsed.priority === 'Medium' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                              'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>{parsed.priority}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold block mb-0.5">RISK ASSESSMENT</span>
                            <span className={`px-2.5 py-0.5 rounded font-bold border ${
                              parsed.risk === 'High' ? 'bg-red-50 text-red-600 border-red-200' :
                              parsed.risk === 'Medium' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                              'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>{parsed.risk} Risk</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">Objectives & Scope</h4>
                          <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                            {parsed.description || 'No objectives provided.'}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Status / Progress Update (Managers/Admins) */}
                  {(user?.roleName === 'SUPER_ADMIN' || user?.roleName === 'ADMIN' || user?.roleName === 'MANAGER') ? (
                    <form onSubmit={handleUpdateProjectStatus} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4">
                      <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider">Update Metrics</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Project Status</label>
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as ProjectStatus)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none"
                          >
                            <option value="Planning">Planning</option>
                            <option value="Active">Active</option>
                            <option value="OnHold">On Hold</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Progress: {editProgress}%</label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={editProgress}
                            onChange={(e) => setEditProgress(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          Save Metrics
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Status</p>
                        <p className="text-sm font-bold text-slate-800">{selectedProjectDetails.status}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Progress</p>
                        <p className="text-sm font-bold text-slate-800">{selectedProjectDetails.progress || 0}% Complete</p>
                      </div>
                    </div>
                  )}

                  {/* Team Members List */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Users size={16} className="text-blue-600" />
                      Assigned Team ({selectedProjectDetails.members?.length || 0})
                    </h4>
                    {selectedProjectDetails.members && selectedProjectDetails.members.length > 0 ? (
                      <div className="border border-slate-100 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                        {selectedProjectDetails.members.map((member) => (
                          <div key={member.id} className="p-3 flex items-center justify-between hover:bg-slate-50/50 transition">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs">
                                {member.user?.username?.charAt(0).toUpperCase() || 'M'}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">{member.user?.username}</p>
                                <p className="text-xs text-slate-500">{member.user?.email}</p>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 text-xs font-bold border border-slate-200 rounded-full text-slate-600 bg-slate-100">
                              {member.role || 'Member'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No team members assigned to this project yet.</p>
                    )}
                  </div>

                  {/* Assign Member Panel (Managers/Admins only) */}
                  {(user?.roleName === 'SUPER_ADMIN' || user?.roleName === 'ADMIN' || user?.roleName === 'MANAGER') && (
                    <form onSubmit={handleAddMember} className="border border-slate-200 p-4 rounded-xl space-y-4">
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                        <PlusCircle size={16} className="text-blue-600" />
                        Assign Team Member
                      </h4>
                      {memberError && (
                        <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded font-semibold">
                          {memberError}
                        </div>
                      )}
                      {memberSuccess && (
                        <div className="p-2 bg-green-50 border border-green-200 text-green-700 text-xs rounded font-semibold flex items-center gap-1">
                          <CheckCircle size={14} />
                          {memberSuccess}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Select Employee</label>
                          <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none"
                          >
                            <option value="">Choose Employee...</option>
                            {employees
                              .filter(emp => !selectedProjectDetails.members?.some(m => m.userId === emp.userId))
                              .map(emp => (
                                <option key={emp.id} value={emp.userId}>
                                  {emp.firstName} {emp.lastName} ({emp.user?.username})
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Role in Project</label>
                          <select
                            value={memberRole}
                            onChange={(e) => setMemberRole(e.target.value as any)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none"
                          >
                            <option value="Member">Member</option>
                            <option value="Lead">Lead</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                        >
                          Assign Member
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-slate-900 text-lg mb-2">Delete Project?</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              This action cannot be undone. All project milestones, tasks, and data will be permanently deleted.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteModal)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold transition shadow-md shadow-rose-600/10 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
