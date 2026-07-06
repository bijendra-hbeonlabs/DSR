'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { Search, UserPlus, Mail, ShieldAlert, X, Eye, Edit2, Trash2, Power, AlertCircle, CheckCircle2 } from 'lucide-react';

interface UserItem {
  id: number;
  username: string;
  email: string;
  roleId: number;
  role?: { id: number; name: string };
  departmentId?: number | null;
  department?: { id: number; name: string } | null;
  active: boolean;
  createdAt: string;
}

const ROLES = [
  { id: 1, name: 'SUPER_ADMIN' },
  { id: 2, name: 'ADMIN' },
  { id: 3, name: 'MANAGER' },
  { id: 4, name: 'EMPLOYEE' }
];

const DEPARTMENTS = [
  { id: 1, name: 'Engineering' },
  { id: 2, name: 'Design' },
  { id: 3, name: 'Sales' },
  { id: 4, name: 'HR' },
  { id: 5, name: 'Finance' }
];

export default function UsersPage() {
  const { token, user } = useAuth();
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  // Modal actions
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState(4); // Default to employee
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [active, setActive] = useState(true);

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      if (!token) return;
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${baseUrl}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsersList(data);
    } catch (error) {
      console.warn('[Users Fetch Warning]', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setIsSubmitting(true);

    if (!username || !email || !password) {
      setFormError('Username, email and password are required');
      setIsSubmitting(false);
      return;
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${baseUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username,
          email,
          password,
          roleId,
          departmentId: departmentId || null,
          active
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to create user');
      }

      setFormSuccess('User account created successfully!');
      // Reset form
      setUsername('');
      setEmail('');
      setPassword('');
      setRoleId(4);
      setDepartmentId('');
      setActive(true);

      await fetchUsers();
      setTimeout(() => {
        setShowAddModal(false);
        setFormSuccess('');
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || 'Error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormError('');
    setFormSuccess('');
    setIsSubmitting(true);

    try {
      const bodyPayload: any = {
        username,
        email,
        roleId,
        departmentId: departmentId || null,
        active
      };
      if (password) {
        bodyPayload.password = password; // Only update if reset was written
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${baseUrl}/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(bodyPayload)
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to update user');
      }

      setFormSuccess('User account updated successfully!');
      await fetchUsers();
      setTimeout(() => {
        setShowEditModal(false);
        setSelectedUser(null);
        setFormSuccess('');
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || 'Error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserActive = async (userItem: UserItem) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${baseUrl}/users/${userItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ active: !userItem.active })
      });
      if (!response.ok) throw new Error('Toggle active status failed');
      await fetchUsers();
    } catch (err) {
      console.warn('[Toggle User Action Warning]', err);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user? This will also delete their Employee Profile.')) return;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${baseUrl}/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Delete user failed');
      await fetchUsers();
    } catch (err) {
      console.warn('[Delete User Action Warning]', err);
    }
  };

  const openEditModal = (userItem: UserItem) => {
    setSelectedUser(userItem);
    setUsername(userItem.username);
    setEmail(userItem.email);
    setPassword('');
    setRoleId(userItem.roleId);
    setDepartmentId(userItem.departmentId || '');
    setActive(userItem.active);
    setFormError('');
    setFormSuccess('');
    setShowEditModal(true);
  };

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const roleName = u.role?.name || ROLES.find(r => r.id === u.roleId)?.name || '';
    const matchesRole = roleFilter === 'All' || roleName === roleFilter;
    const matchesStatus = statusFilter === 'All' || 
                          (statusFilter === 'Active' && u.active) || 
                          (statusFilter === 'Inactive' && !u.active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  if (user?.roleName !== 'SUPER_ADMIN' && user?.roleName !== 'ADMIN') {
    return (
      <div className="p-8 text-center bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-sm shadow-md">
          <ShieldAlert size={48} className="mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
          <p className="text-slate-500 text-sm mt-2">Only system administrators can access the User Management control panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-slate-50 min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">User Accounts</h1>
          <p className="text-slate-500 mt-1">Manage corporate login credentials, roles, and access settings</p>
        </div>
        <button
          onClick={() => {
            setUsername('');
            setEmail('');
            setPassword('');
            setRoleId(4);
            setDepartmentId('');
            setActive(true);
            setFormError('');
            setFormSuccess('');
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition text-sm font-semibold shadow-sm cursor-pointer"
        >
          <UserPlus size={18} />
          Create User Account
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search username or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium"
          />
        </div>
        {/* Dropdowns */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 w-full sm:w-auto"
          >
            <option value="All">All Roles</option>
            {ROLES.map(r => <option key={r.id} value={r.name}>{r.name === 'SUPER_ADMIN' ? 'Super Admin' : r.name.replace(/_/g, ' ')}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 w-full sm:w-auto"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            Loading user profiles...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <Mail size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="font-semibold text-slate-700 text-lg">No accounts found</p>
            <p className="text-slate-400 mt-1 max-w-sm mx-auto">No accounts match the current query filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-extrabold tracking-wider">
                  <th className="px-6 py-4">Username</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Created At</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const roleLabel = u.role?.name || ROLES.find(r => r.id === u.roleId)?.name || 'EMPLOYEE';
                  
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {u.username}
                        {u.employee && (
                          <span className="block text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                            Linked Profile: {u.employee.firstName} {u.employee.lastName}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-sm font-semibold">
                        {u.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] border tracking-wider ${
                          roleLabel === 'SUPER_ADMIN' 
                            ? 'bg-purple-50 text-purple-700 border-purple-100'
                            : roleLabel === 'ADMIN'
                            ? 'bg-rose-50 text-rose-700 border-rose-100'
                            : roleLabel === 'MANAGER'
                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          {roleLabel === 'SUPER_ADMIN' ? 'Super Admin' : roleLabel.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-sm font-medium">
                        {u.department?.name || u.employee?.department?.name || 'Global'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs font-semibold">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          u.active 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {u.active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-1.5">
                        <button
                          onClick={() => toggleUserActive(u)}
                          className={`p-1.5 rounded-lg border transition cursor-pointer inline-block ${
                            u.active 
                              ? 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700' 
                              : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100'
                          }`}
                          title={u.active ? 'Disable Account' : 'Enable Account'}
                        >
                          <Power size={14} />
                        </button>
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-800 rounded-lg transition inline-block cursor-pointer"
                          title="Edit Settings"
                        >
                          <Edit2 size={14} />
                        </button>
                        {u.id !== user?.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 border border-transparent rounded-lg transition inline-block cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={14} />
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

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
              <UserPlus className="text-blue-600" /> Create User Account
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

            <form onSubmit={handleAddUserSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
                <input
                  type="text"
                  placeholder="superadmin, engineer1 etc."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="user@hbeonlabs.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Access Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Access Role</label>
                  <select
                    value={roleId}
                    onChange={(e) => setRoleId(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                  >
                    {ROLES.map(r => <option key={r.id} value={r.id}>{r.name === 'SUPER_ADMIN' ? 'Super Admin' : r.name.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Department</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Global / None</option>
                    {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="activeCheck" className="text-sm font-bold text-slate-700 cursor-pointer">
                  Activate Account Instantly
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                    'Create Account'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Edit2 className="text-blue-600 animate-pulse" /> Update Account: {selectedUser.username}
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

            <form onSubmit={handleEditUserSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reset Password (Optional)</label>
                <input
                  type="password"
                  placeholder="Leave blank to keep current"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Access Role</label>
                  <select
                    value={roleId}
                    onChange={(e) => setRoleId(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                  >
                    {ROLES.map(r => <option key={r.id} value={r.id}>{r.name === 'SUPER_ADMIN' ? 'Super Admin' : r.name.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Department</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Global / None</option>
                    {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="editActiveCheck"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="editActiveCheck" className="text-sm font-bold text-slate-700 cursor-pointer">
                  Activate Account
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
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
                    'Save Changes'
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
