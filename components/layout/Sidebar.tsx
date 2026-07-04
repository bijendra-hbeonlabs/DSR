'use client';

import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Clock,
  FileText,
  CheckSquare,
  Briefcase,
  Users,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  Building,
  Zap,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navigationConfig = {
  SUPER_ADMIN: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Users', href: '/users', icon: Users },
    { label: 'Departments', href: '/departments', icon: Building },
    { label: 'Human Capital', href: '/hr-finance', icon: FileText },
    { label: 'Leaves', href: '/leaves', icon: Calendar },
    { label: 'System Settings', href: '/system-settings', icon: Zap },
  ],
  ADMIN: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Attendance', href: '/attendance', icon: Clock },
    { label: 'Daily DSR', href: '/dsr', icon: FileText },
    { label: 'Tasks', href: '/tasks', icon: CheckSquare },
    { label: 'Projects', href: '/projects', icon: Briefcase },
    { label: 'Human Capital', href: '/hr-finance', icon: FileText },
    { label: 'Employees', href: '/employees', icon: Users },
    { label: 'Departments', href: '/departments', icon: Building },
    { label: 'Leaves', href: '/leaves', icon: Calendar },
  ],
  MANAGER: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Team Attendance', href: '/attendance', icon: Clock },
    { label: 'Team DSR', href: '/dsr', icon: FileText },
    { label: 'Tasks', href: '/tasks', icon: CheckSquare },
    { label: 'Projects', href: '/projects', icon: Briefcase },
    { label: 'Team', href: '/team', icon: Users },
    { label: 'Leaves', href: '/leaves', icon: Calendar },
  ],
  EMPLOYEE: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Attendance', href: '/attendance', icon: Clock },
    { label: 'My DSR', href: '/dsr', icon: FileText },
    { label: 'My Tasks', href: '/tasks', icon: CheckSquare },
    { label: 'My Projects', href: '/projects', icon: Briefcase },
    { label: 'Leaves', href: '/leaves', icon: Calendar },
  ],
};

export default function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load configuration from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar_collapsed');
      setIsCollapsed(saved === 'true');
    }
  }, []);

  if (!user) return null;

  const navItems = navigationConfig[user.roleName as keyof typeof navigationConfig] || [];
  const isActive = (href: string) => pathname.startsWith(href);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar_collapsed', String(nextState));
    }
  };

  return (
    <>
      {/* Mobile Toggle */}
      <div className="hidden max-w-sm:flex items-center justify-between p-4 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <img src="/logo-horizontal.svg" alt="HBEONLABS Logo" className="h-8 w-auto object-contain block dark:brightness-110" />
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden">
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`bg-card border-r border-border flex flex-col transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed lg:static inset-y-0 left-0 z-40 lg:z-0`}
      >
        {/* Logo Section with Collapse Button */}
        <div className="px-4 border-b border-border hidden lg:flex items-center justify-between h-20">
          {!isCollapsed ? (
            <img src="/logo-horizontal.svg" alt="HBEONLABS Logo" className="h-12 w-auto object-contain block dark:brightness-110" />
          ) : (
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-sm">
              H
            </div>
          )}
          <button
            onClick={toggleCollapse}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-950 transition cursor-pointer"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center rounded-lg transition-all ${
                  isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-2.5'
                } ${
                  active
                    ? 'bg-blue-50 text-blue-600 font-semibold border border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon size={18} className="shrink-0" />
                {!isCollapsed && <span className="text-sm truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 lg:hidden z-30" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
}
