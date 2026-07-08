'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { employeesAPI } from '@/lib/api-client';
import { User, Phone, Mail, Calendar, Building, Award, Shield, Key, AlertCircle, CheckCircle2 } from 'lucide-react';

const baseUrl = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:5001/api`
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api');

export default function ProfilePage() {
  const { token, user, refreshUser } = useAuth();

  // Tab control
  const [activeTab, setActiveTab] = useState<'info' | 'security'>('info');

  // Info edit form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Password reset form states
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fullEmployee, setFullEmployee] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(true);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://66.116.227.217:5001/api';

  useEffect(() => {
    if (user?.employee) {
      setFirstName(user.employee.firstName || '');
      setLastName(user.employee.lastName || '');
      setPhone(user.employee.phone || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // Fetch fresh employee data directly from server (bypasses stale localStorage cache)
  useEffect(() => {
    const fetchFullProfile = async () => {
      try {
        if (!token || !user?.employee?.id) return;
        // Direct fetch so we always get the latest department + designation from DB
        const res = await fetch(`${API_BASE}/employees/${user.employee.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setFullEmployee(data);
          // Update form fields from fresh data too
          setFirstName(data.firstName || '');
          setLastName(data.lastName || '');
          setPhone(data.phone || '');
        }
      } catch (error) {
        console.error('[Profile] Failed to load fresh employee data:', error);
      } finally {
        setIsSyncing(false);
      }
    };
    fetchFullProfile();
  }, [token, user?.employee?.id]);

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setIsSubmitting(true);

    if (!firstName || !lastName || !email) {
      setFormError('First Name, Last Name and Email are required');
      setIsSubmitting(false);
      return;
    }

    try {
      if (!token) return;

      // 1. Update Employee Profile
      if (user?.employee?.id) {
        await employeesAPI.update(user.employee.id, {
          firstName,
          lastName,
          phone,
          email
        }, token);
      }

      // 2. Update User credentials email if it changed
      if (email !== user?.email) {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://66.116.227.217:5001/api';
        await fetch(`${baseUrl}/users/${user?.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ email })
        });
      }

      setFormSuccess('Profile details updated successfully!');

      // Refresh context session
      if (refreshUser) {
        await refreshUser();
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to update profile information');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setIsSubmitting(true);

    if (!password || !confirmPassword) {
      setFormError('Please fill in password fields');
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      setIsSubmitting(false);
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters');
      setIsSubmitting(false);
      return;
    }

    try {
      if (!token || !user) return;

      const response = await fetch(`${baseUrl}/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to update password');
      }

      setFormSuccess('Password changed successfully!');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-8 bg-slate-50 min-h-screen p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Profile Settings</h1>
        <p className="text-slate-500 mt-1">View personal statistics and update account information</p>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-md">
          {user.username[0].toUpperCase()}
        </div>
        <div className="text-center md:text-left space-y-1">
          <h2 className="text-2xl font-bold text-slate-900">
            {user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.username}
          </h2>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 border border-slate-200 rounded-full font-bold text-xs">
              Username: {user.username}
            </span>
            <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 border border-blue-100 rounded-full font-bold text-xs flex items-center gap-1">
              <Shield size={12} />
              {user.roleName === 'SUPER_ADMIN' ? 'Super Admin' : user.roleName.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-slate-400 text-xs font-semibold pt-1">
            Account Active since {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition cursor-pointer ${activeTab === 'info'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
            }`}
        >
          <User size={16} /> Personal Info
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition cursor-pointer ${activeTab === 'security'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
            }`}
        >
          <Key size={16} /> Password & Security
        </button>
      </div>

      {/* Forms Panels */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {formError && (
          <div className="p-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-2 mb-6">
            <AlertCircle size={14} />
            {formError}
          </div>
        )}
        {formSuccess && (
          <div className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-2 mb-6">
            <CheckCircle2 size={14} />
            {formSuccess}
          </div>
        )}

        {activeTab === 'info' ? (
          <form onSubmit={handleInfoSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>
            </div>

            {/* Corporate Read Only Fields */}
            {user.employee && (
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Job Info (Read-Only)</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                      <Building size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Department</p>
                      <p className="font-bold text-slate-700">
                        {isSyncing ? (
                          <span className="inline-block w-20 h-4 bg-slate-100 rounded animate-pulse" />
                        ) : (
                          fullEmployee?.department?.name || 'N/A'
                        )}
                      </p>
                    </div>
                  </div>


                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                      <Award size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Designation</p>
                      <p className="font-bold text-slate-700">
                        {isSyncing ? (
                          <span className="inline-block w-20 h-4 bg-slate-100 rounded animate-pulse" />
                        ) : (
                          fullEmployee?.designation?.name || 'N/A'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Joining Date</p>
                      <p className="font-bold text-slate-700">
                        {user.employee.joinDate ? new Date(user.employee.joinDate).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition font-bold text-sm shadow-md cursor-pointer flex items-center justify-center min-w-[140px]"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-md">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Password</label>
              <input
                type="password"
                placeholder="Enter at least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirm New Password</label>
              <input
                type="password"
                placeholder="Re-type password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 font-bold"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition font-bold text-sm shadow-md cursor-pointer flex items-center justify-center min-w-[160px]"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Update Password'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
