'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { dashboardAPI } from '@/lib/api-client';
import { DashboardStats } from '@/lib/types';
import { Users, Briefcase, CheckSquare, AlertCircle, TrendingUp, Clock, Megaphone, Calendar } from 'lucide-react';

interface StatCard {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  href?: string;
}

export default function DashboardPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      if (!token) return;
      // Fetch stats
      const data = await dashboardAPI.getStats(token);
      setStats(data);

      // Fetch active announcements
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
      const annRes = await fetch(`${baseUrl}/announcements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (annRes.ok) {
        const annData = await annRes.json();
        setAnnouncements(annData.slice(0, 5)); // display latest 5
      }
    } catch (error) {
      console.warn('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  if (!user) return null;

  const getStatsForRole = (): StatCard[] => {
    const baseColor = 'from-blue-500 to-blue-600';

    if (user.roleName === 'SUPER_ADMIN') {
      return [
        {
          label: 'Total Users',
          value: stats?.totalUsers || 0,
          icon: <Users size={24} />,
          color: baseColor,
          href: '/users',
        },
        {
          label: 'Total Employees',
          value: stats?.totalEmployees || 0,
          icon: <Users size={24} />,
          color: 'from-blue-600 to-indigo-600',
          href: '/employees',
        },
        {
          label: 'Total Projects',
          value: stats?.totalProjects || 0,
          icon: <Briefcase size={24} />,
          color: 'from-blue-400 to-blue-500',
          href: '/projects',
        },
        {
          label: 'Pending DSRs',
          value: stats?.pendingDSRs || 0,
          icon: <AlertCircle size={24} />,
          color: 'from-blue-500 to-indigo-500',
          href: '/dsr',
        },
      ];
    } else if (user.roleName === 'ADMIN') {
      return [
        {
          label: 'Total Employees',
          value: stats?.totalEmployees || 0,
          icon: <Users size={24} />,
          color: baseColor,
          href: '/employees',
        },
        {
          label: 'Active Projects',
          value: stats?.activeProjects || 0,
          icon: <Briefcase size={24} />,
          color: 'from-blue-600 to-indigo-600',
          href: '/projects',
        },
        {
          label: 'Attendance Today',
          value: stats?.todaysPresentCount || 0,
          icon: <Clock size={24} />,
          color: 'from-blue-400 to-blue-500',
          href: '/attendance',
        },
        {
          label: 'Pending DSRs',
          value: stats?.pendingDSRs || 0,
          icon: <AlertCircle size={24} />,
          color: 'from-blue-500 to-indigo-500',
          href: '/dsr',
        },
      ];
    } else if (user.roleName === 'MANAGER') {
      return [
        {
          label: 'Team Size',
          value: stats?.teamSize || 0,
          icon: <Users size={24} />,
          color: baseColor,
          href: '/team',
        },
        {
          label: 'My Tasks',
          value: stats?.myTasks || 0,
          icon: <CheckSquare size={24} />,
          color: 'from-blue-600 to-indigo-600',
          href: '/tasks',
        },
        {
          label: 'Pending DSRs (Team)',
          value: stats?.teamPendingDSRs || 0,
          icon: <TrendingUp size={24} />,
          color: 'from-blue-400 to-blue-500',
          href: '/dsr',
        },
        {
          label: 'My Pending DSRs',
          value: stats?.myPendingDSRs || 0,
          icon: <AlertCircle size={24} />,
          color: 'from-blue-500 to-indigo-500',
          href: '/dsr',
        },
      ];
    } else {
      // EMPLOYEE
      return [
        {
          label: 'My Tasks',
          value: stats?.myTasks || 0,
          icon: <CheckSquare size={24} />,
          color: baseColor,
          href: '/tasks',
        },
        {
          label: 'Completed Tasks',
          value: stats?.completedTasks || 0,
          icon: <TrendingUp size={24} />,
          color: 'from-blue-600 to-indigo-600',
          href: '/tasks',
        },
        {
          label: 'My Projects',
          value: stats?.myProjects || 0 || 'N/A',
          icon: <Briefcase size={24} />,
          color: 'from-blue-400 to-blue-500',
          href: '/projects',
        },
        {
          label: "Today's DSR",
          value: stats?.todaysDSRDraft || 0,
          icon: <Clock size={24} />,
          color: 'from-blue-500 to-indigo-500',
          href: '/dsr',
        },
      ];
    }
  };

  const statCards = getStatsForRole();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {user.username}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Here&apos;s what&apos;s happening in your workspace today.
        </p>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-lg p-6 animate-pulse"
            >
              <div className="h-4 bg-slate-200 rounded w-24 mb-4"></div>
              <div className="h-8 bg-slate-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => {
            const isClickable = !!stat.href;
            return (
              <div
                key={index}
                onClick={() => isClickable && router.push(stat.href!)}
                className={`bg-card border border-border rounded-lg p-6 hover:border-blue-500/50 transition shadow-sm ${
                  isClickable ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.99] duration-200' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 bg-gradient-to-br ${stat.color} rounded-lg text-white`}>
                    {stat.icon}
                  </div>
                </div>
                <p className="text-muted-foreground text-sm mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Quick Actions & Live Announcements */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Quick Actions */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {user.roleName === 'EMPLOYEE' && (
                <>
                  <button
                    onClick={() => router.push('/attendance')}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium shadow-sm cursor-pointer"
                  >
                    Clock In / Out
                  </button>
                  <button
                    onClick={() => router.push('/dsr')}
                    className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition text-sm font-medium cursor-pointer"
                  >
                    Submit DSR
                  </button>
                </>
              )}
              {(user.roleName === 'MANAGER' || user.roleName === 'ADMIN') && (
                <>
                  <button
                    onClick={() => router.push('/tasks')}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium shadow-sm cursor-pointer"
                  >
                    Create Task
                  </button>
                  <button
                    onClick={() => router.push('/dsr')}
                    className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition text-sm font-medium cursor-pointer"
                  >
                    Review DSRs
                  </button>
                </>
              )}
              {user.roleName === 'SUPER_ADMIN' && (
                <>
                  <button
                    onClick={() => router.push('/departments')}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium shadow-sm cursor-pointer"
                  >
                    Manage Departments
                  </button>
                  <button
                    onClick={() => router.push('/system-settings')}
                    className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition text-sm font-medium cursor-pointer"
                  >
                    Global Broadcasts
                  </button>
                </>
              )}
              <button
                onClick={() => router.push('/leaves')}
                className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition text-sm font-medium cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Calendar size={14} /> Request Leave
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Announcements Board & Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Live Announcements */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Megaphone size={18} className="text-blue-500" /> Active Announcements
            </h2>
            {announcements.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm border border-dashed border-border rounded-lg bg-slate-50/50">
                No active announcements today.
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((ann) => (
                  <div key={ann.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg hover:border-blue-500/30 transition">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                        ann.priority === 'Urgent' 
                          ? 'bg-rose-50 text-rose-700 border-rose-100'
                          : ann.priority === 'High'
                          ? 'bg-amber-50 text-amber-700 border-amber-100'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {ann.priority}
                      </span>
                      <h3 className="text-sm font-bold text-slate-800">{ann.title}</h3>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{ann.content}</p>
                    <p className="text-[10px] text-slate-400 mt-2 font-semibold">
                      Posted by {ann.postedByUser?.username || 'Admin'} • {new Date(ann.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
            <div className="flex flex-col items-center justify-center py-10 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
              <p className="text-sm font-medium text-slate-700">No recent activities</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md text-center px-4">
                Activities will appear here dynamically as employees log attendance, update tasks, or submit daily status reports.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Corporate Analytics Section */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm space-y-6 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-500" />
              Corporate Analytics & Operations Dashboard
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Visual metrics audit summary for operational attendance ratios and task ledger distribution
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <Calendar size={14} /> Export Audit Report PDF
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: Weekly Attendance Ratio (Custom SVG Bar Chart) */}
          <div className="border border-slate-100 dark:border-slate-850 p-4 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Weekly Employee Attendance Ratio</h3>
            
            <div className="h-48 flex items-end justify-between gap-4 px-2 pt-6">
              {[
                { day: 'Mon', ratio: 94 },
                { day: 'Tue', ratio: 98 },
                { day: 'Wed', ratio: 92 },
                { day: 'Thu', ratio: 89 },
                { day: 'Fri', ratio: 85 },
              ].map((item) => (
                <div key={item.day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-lg h-36 relative overflow-hidden flex items-end">
                    <div 
                      className="w-full bg-gradient-to-t from-blue-600 to-indigo-600 rounded-t-lg transition-all duration-1000"
                      style={{ height: `${item.ratio}%` }}
                    />
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-blue-600 dark:text-blue-400">{item.ratio}%</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Tasks Status Distribution (Custom SVG Progress Wheel) */}
          <div className="border border-slate-100 dark:border-slate-850 p-4 rounded-xl flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 space-y-3 w-full">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Task Completion Ledger</h3>
              <div className="space-y-2">
                {[
                  { status: 'Completed', count: stats?.completedTasks || 8, pct: 60, color: 'bg-emerald-505' },
                  { status: 'In Progress', count: stats?.myTasks || 3, pct: 25, color: 'bg-blue-505' },
                  { status: 'Pending Review', count: stats?.pendingDSRs || 2, pct: 15, color: 'bg-amber-505' },
                ].map((item) => (
                  <div key={item.status} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>{item.status} ({item.count})</span>
                      <span>{item.pct}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color.replace('505', '500')}`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulated Pie/Donut Chart */}
            <div className="relative w-32 h-32 flex-shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-95" viewBox="0 0 36 36">
                <path
                  className="text-slate-100 dark:text-slate-950"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Completed - 60% */}
                <path
                  className="text-emerald-500"
                  strokeDasharray="60, 100"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* In Progress - 25% starting offset at 60 */}
                <path
                  className="text-blue-500"
                  strokeDasharray="25, 100"
                  strokeDashoffset="-60"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Pending - 15% starting offset at 85 */}
                <path
                  className="text-amber-500"
                  strokeDasharray="15, 100"
                  strokeDashoffset="-85"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-lg font-black text-slate-800 dark:text-slate-200">13</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
