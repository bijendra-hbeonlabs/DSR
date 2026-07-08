'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { tasksAPI, projectsAPI, employeesAPI } from '@/lib/api-client';
import { Task, TaskStatus, TaskPriority, Project, Employee } from '@/lib/types';
import { Plus, Edit2, Trash2, Eye, Filter, Grid3x3, List, X, CheckSquare, Clock, AlertCircle, Play, Check } from 'lucide-react';

type ViewMode = 'kanban' | 'table';
const STATUSES: TaskStatus[] = ['Pending', 'InProgress', 'Completed', 'Closed'];

const AVAILABLE_TECH = [
  'React', 'Next.js', 'TypeScript', 'Node.js', 'Python', 'Go', 'Rust',
  'MySQL', 'PostgreSQL', 'SQLite', 'MongoDB', 'Redis', 'Docker', 'AWS',
  'TailwindCSS', 'Figma', 'Embedded C', 'Firmware', 'Hardware', 'UI/UX', 'CI/CD'
];

export default function TasksPage() {
  const { user, token } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<Task | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<number | null>(null);

  // Form states (Create Task)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<number | '' | 'custom'>('');
  const [customProjectName, setCustomProjectName] = useState('');
  const [assignedTo, setAssignedTo] = useState<number | ''>('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [createStatus, setCreateStatus] = useState<TaskStatus>('Pending');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [taskType, setTaskType] = useState('Development');
  const [techStack, setTechStack] = useState<string[]>([]);
  const [formError, setFormError] = useState('');

  // Form states (Update Task Progress / Status)
  const [updateStatus, setUpdateStatus] = useState<TaskStatus>('Pending');
  const [updateProgress, setUpdateProgress] = useState(0);
  const [logHours, setLogHours] = useState('');
  const [updateError, setUpdateError] = useState('');

  const fetchTasks = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const response = await tasksAPI.getAll(params, token);
      setTasks(response.data || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetadata = async () => {
    if (!token) return;
    try {
      const projResp = await projectsAPI.getAll({}, token);
      setProjects(projResp.data || []);

      const empResp = await employeesAPI.getAll(token);
      const empData = Array.isArray(empResp) ? empResp : empResp.data || empResp.employees || [];
      setEmployees(empData);
    } catch (error) {
      console.error('Failed to fetch projects/employees:', error);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchMetadata();
  }, [token, statusFilter, priorityFilter]);

  const handleOpenViewModal = async (id: number) => {
    setShowViewModal(true);
    setIsLoadingDetails(true);
    setUpdateError('');
    setLogHours('');
    try {
      const details = await tasksAPI.getById(id, token || undefined);
      setSelectedTaskDetails(details);
      setUpdateStatus(details.status);
      setUpdateProgress(details.progressPercentage || 0);
    } catch (error) {
      console.error('Failed to load task details:', error);
      setSelectedTaskDetails(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!title || !projectId) {
      setFormError('Task Title and Project are required');
      return;
    }

    if (projectId === 'custom' && !customProjectName.trim()) {
      setFormError('Custom Project Name is required');
      return;
    }

    try {
      await tasksAPI.create({
        title,
        description,
        projectId: projectId === 'custom' ? undefined : Number(projectId),
        customProjectName: projectId === 'custom' ? customProjectName.trim() : undefined,
        assignedTo: assignedTo ? Number(assignedTo) : undefined,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        status: createStatus,
        estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
        taskType,
        techStack,
      }, token || undefined);

      setTitle('');
      setDescription('');
      setProjectId('');
      setCustomProjectName('');
      setAssignedTo('');
      setPriority('Medium');
      setDueDate('');
      setStartDate('');
      setCreateStatus('Pending');
      setEstimatedHours('');
      setTaskType('Development');
      setTechStack([]);
      setShowCreateModal(false);
      await fetchTasks();
    } catch (error: any) {
      setFormError(error.message || 'Failed to create task');
    }
  };

  const handleUpdateTaskProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskDetails) return;
    setUpdateError('');

    try {
      const updatedFields: any = {
        status: updateStatus,
        progressPercentage: updateProgress
      };

      if (logHours) {
        const addedHours = Number(logHours);
        if (isNaN(addedHours) || addedHours < 0) {
          setUpdateError('Invalid hours logged');
          return;
        }
        updatedFields.actualHours = (Number(selectedTaskDetails.actualHours) || 0) + addedHours;
      }

      await tasksAPI.update(selectedTaskDetails.id, updatedFields, token || undefined);
      setLogHours('');
      await handleOpenViewModal(selectedTaskDetails.id);
      await fetchTasks();
    } catch (error: any) {
      setUpdateError(error.message || 'Failed to update task');
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    try {
      await tasksAPI.delete(id, token);
      setTasks(tasks.filter(task => task.id !== id));
      setShowDeleteModal(null);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'Critical':
      case 'High':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const getStatusLabel = (status: TaskStatus) => {
    switch (status) {
      case 'InProgress': return 'In Progress';
      case 'Completed': return 'Completed';
      case 'Closed': return 'Closed';
      default: return 'Pending';
    }
  };

  const getStatusBg = (status: TaskStatus) => {
    switch (status) {
      case 'InProgress': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Closed': return 'bg-slate-100 text-slate-700 border-slate-300';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  // Group tasks for Kanban board
  const kanbanColumns = {
    Pending: tasks.filter(t => t.status === 'Pending'),
    InProgress: tasks.filter(t => t.status === 'InProgress'),
    Completed: tasks.filter(t => t.status === 'Completed'),
    Closed: tasks.filter(t => t.status === 'Closed'),
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tasks</h1>
          <p className="text-slate-500 mt-2">Manage, assign, and track progress of tasks</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition ${viewMode === 'kanban' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              title="Kanban Board View"
            >
              <Grid3x3 size={18} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition ${viewMode === 'table' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              title="Table view list"
            >
              <List size={18} />
            </button>
          </div>
          {(user?.roleName === 'SUPER_ADMIN' || user?.roleName === 'ADMIN' || user?.roleName === 'MANAGER') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-semibold shadow-md shadow-blue-600/10 cursor-pointer"
            >
              <Plus size={18} />
              New Task
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-4 items-center">
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-black text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => (
              <option key={s} value={s}>{getStatusLabel(s)}</option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-black text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
        <button
          onClick={() => {
            setStatusFilter('');
            setPriorityFilter('');
          }}
          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition text-sm font-semibold cursor-pointer"
        >
          Reset Filters
        </button>
      </div>

      {/* Kanban Board View */}
      {viewMode === 'kanban' ? (
        isLoading ? (
          <div className="text-center py-12 text-slate-500 animate-pulse font-medium">Loading task columns...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            {STATUSES.map((col) => {
              const colTasks = kanbanColumns[col] || [];
              return (
                <div key={col} className="bg-slate-100/70 border border-slate-200 rounded-xl p-4 min-h-[500px] flex flex-col space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <CheckSquare size={16} className="text-blue-600" />
                      {getStatusLabel(col)}
                    </h3>
                    <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-xs font-bold text-slate-600">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="space-y-3 overflow-y-auto flex-1 max-h-[70vh] pr-1">
                    {colTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleOpenViewModal(task.id)}
                        className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition cursor-pointer space-y-3 border-l-4 border-l-blue-500"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-slate-800 text-sm line-clamp-2 leading-relaxed">{task.title}</h4>
                          <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold whitespace-nowrap ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">{task.description || 'No description provided.'}</p>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-bold">
                          <span>Progress: {task.progressPercentage || 0}%</span>
                          {task.dueDate && <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                        </div>
                        {task.assignee && (
                          <div className="flex items-center gap-1.5 pt-1 text-[10px] text-slate-500 font-semibold">
                            <div className="w-4 h-4 bg-slate-100 rounded-full flex items-center justify-center font-bold text-[8px] text-blue-600 border border-slate-200">
                              {task.assignee.username.charAt(0).toUpperCase()}
                            </div>
                            <span>{task.assignee.username}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    {colTasks.length === 0 && (
                      <p className="text-xs text-slate-400 italic text-center pt-8">No tasks in column</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Table / List View */
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Task Details</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Project</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Assignee</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => handleOpenViewModal(task.id)}
                    className="hover:bg-slate-50/50 transition cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-semibold text-slate-800">{task.title}</div>
                        <div className="text-xs text-slate-400">Task ID: #{task.id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {task.project?.name || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {task.assignee?.username || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${getStatusBg(task.status)}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full border text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <CheckSquare size={20} className="text-blue-600" />
                Assign New Task
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
                  {formError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Task Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Design Dashboard Prototypes"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Task Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe scope of work, checklist or requirements..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Project *</label>
                  <select
                    required
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value === '' ? '' : (e.target.value === 'custom' ? 'custom' : Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Choose Project...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                    <option value="custom">-- Create Custom Project --</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Assign To</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.userId}>
                        {e.firstName} {e.lastName} ({e.user?.username})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {projectId === 'custom' && (
                <div className="space-y-1 p-3.5 bg-slate-50 border border-slate-200 rounded-xl animate-fade-in">
                  <label className="text-xs font-bold text-slate-700">Custom Project Name *</label>
                  <input
                    type="text"
                    required
                    value={customProjectName}
                    onChange={(e) => setCustomProjectName(e.target.value)}
                    placeholder="e.g. Firmware Sync v2"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Task Status</label>
                  <select
                    value={createStatus}
                    onChange={(e) => setCreateStatus(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="InProgress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Est. Hours</label>
                  <input
                    type="number"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    placeholder="e.g. 12"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                  />
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
                  <label className="text-xs font-bold text-slate-700">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Task Type</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                  >
                    <option value="Development">Development</option>
                    <option value="Bug Fixing">Bug Fixing</option>
                    <option value="Design">Design</option>
                    <option value="Research">Research</option>
                    <option value="Testing">Testing</option>
                    <option value="Documentation">Documentation</option>
                    <option value="Hardware Design">Hardware Design</option>
                    <option value="Firmware Dev">Firmware Dev</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Choose Tech Stack</label>
                <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-36 overflow-y-auto">
                  {AVAILABLE_TECH.map(tech => {
                    const isSelected = techStack.includes(tech);
                    return (
                      <button
                        key={tech}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setTechStack(techStack.filter(t => t !== tech));
                          } else {
                            setTechStack([...techStack, tech]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {tech}
                      </button>
                    );
                  })}
                </div>
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
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details and Progress Logging Modal */}
      {showViewModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">
                Task Workspace
              </h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedTaskDetails(null);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {isLoadingDetails ? (
                <div className="py-8 text-center text-slate-500 animate-pulse font-medium">Fetching details...</div>
              ) : !selectedTaskDetails ? (
                <div className="py-8 text-center text-rose-500 font-semibold">Failed to fetch task details.</div>
              ) : (
                <div className="space-y-6">
                  {/* Task Header info */}
                  <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold uppercase mb-1.5 ${getPriorityColor(selectedTaskDetails.priority)}`}>
                        {selectedTaskDetails.priority} Priority
                      </span>
                      <h3 className="font-bold text-slate-900 text-xl leading-snug">{selectedTaskDetails.title}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Project: {selectedTaskDetails.project?.name || 'Internal Work'}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-bold ${getStatusBg(selectedTaskDetails.status)}`}>
                        {getStatusLabel(selectedTaskDetails.status)}
                      </span>
                      {selectedTaskDetails.dueDate && (
                        <p className="text-[10px] text-slate-500 font-semibold mt-2">
                          Due: {new Date(selectedTaskDetails.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Task Description */}
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Objectives & Scope</h4>
                    <p className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {selectedTaskDetails.description || 'No description or checklists provided.'}
                    </p>
                  </div>

                  {/* Task Type & Tech Stack Info */}
                  {(selectedTaskDetails.taskType || (selectedTaskDetails.techStack && selectedTaskDetails.techStack.length > 0)) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      {selectedTaskDetails.taskType && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Task Type</span>
                          <span className="inline-block bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-md border border-blue-100">
                            {selectedTaskDetails.taskType}
                          </span>
                        </div>
                      )}
                      {selectedTaskDetails.techStack && selectedTaskDetails.techStack.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Tech Stack</span>
                          <div className="flex flex-wrap gap-1">
                            {selectedTaskDetails.techStack.map((tech: string) => (
                              <span key={tech} className="bg-white text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-200">
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Timings */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs font-semibold text-slate-700">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Estimated Hours</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedTaskDetails.estimatedHours || 'Not Estimated'} hrs</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Actual Hours Spent</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedTaskDetails.actualHours || 0} hrs</p>
                    </div>
                  </div>

                  {/* Update Status and Log Work hours panel */}
                  {user && (
                    <form onSubmit={handleUpdateTaskProgress} className="border border-slate-200 p-4 rounded-xl space-y-4">
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                        <Clock size={16} className="text-blue-600" />
                        Log Work & Update Progress
                      </h4>
                      {updateError && (
                        <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded font-semibold">
                          {updateError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Task Status</label>
                          <select
                            value={updateStatus}
                            onChange={(e) => setUpdateStatus(e.target.value as TaskStatus)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none"
                          >
                            <option value="Pending">Pending</option>
                            <option value="InProgress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Closed">Closed</option>
                          </select>
                        </div>
                        <div className="space-y-1 col-span-2">
                          <label className="text-xs font-bold text-slate-700">Task Progress: {updateProgress}%</label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={updateProgress}
                            onChange={(e) => setUpdateProgress(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mt-2"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Log Extra Work Hours</label>
                          <input
                            type="number"
                            step="0.5"
                            value={logHours}
                            onChange={(e) => setLogHours(e.target.value)}
                            placeholder="e.g. 2.5 (hours)"
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none"
                          />
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                          >
                            Update Workspace
                          </button>
                        </div>
                      </div>
                    </form>
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
