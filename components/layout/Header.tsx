'use client';

import { useAuth } from '@/lib/auth-context';
import { Bell, Search, User, LogOut, Settings, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { announcementsAPI } from '@/lib/api-client';

export default function Header() {
  const { user, token, logout } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Announcements notification state
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showAnnouncementsDropdown, setShowAnnouncementsDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        if (!token) return;
        const res = await announcementsAPI.getAll(token);
        const list = Array.isArray(res) ? res : [];
        setAnnouncements(list);
        
        // Calculate unread count comparing with local storage timestamp
        const lastSeenTime = localStorage.getItem('last_seen_announcements_time');
        if (lastSeenTime) {
          const parsedTime = new Date(lastSeenTime).getTime();
          const unread = list.filter((a: any) => new Date(a.createdAt).getTime() > parsedTime).length;
          setUnreadCount(unread);
        } else {
          setUnreadCount(list.length);
        }
      } catch (error) {
        console.warn('Failed to load announcements for header notification:', error);
      }
    };

    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const handleBellClick = () => {
    setShowAnnouncementsDropdown(!showAnnouncementsDropdown);
    setShowUserMenu(false);
    setUnreadCount(0);
    localStorage.setItem('last_seen_announcements_time', new Date().toISOString());
  };

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
      {/* Left Section */}
      <div className="flex items-center gap-4 flex-1">
        {/* Search Bar */}
        <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
          <Search size={18} className="text-muted-foreground" />
          <input
            type="text"
            placeholder="Search anything..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-black placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={handleBellClick}
            className="relative p-2 hover:bg-slate-100 rounded-lg transition cursor-pointer dark:hover:bg-slate-800"
          >
            <Bell size={20} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-rose-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Announcements Dropdown */}
          {showAnnouncementsDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 dark:bg-slate-900 dark:border-slate-800 max-h-96 overflow-y-auto">
              <div className="p-4 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Announcements</h4>
                <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-bold dark:bg-blue-950/40 dark:text-blue-400">
                  {announcements.length} Total
                </span>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {announcements.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                    No announcements posted yet.
                  </div>
                ) : (
                  announcements.map((ann) => (
                    <div key={ann.id} className="p-4 hover:bg-slate-50 transition dark:hover:bg-slate-800/40 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{ann.title}</h5>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                          ann.priority === 'High' 
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400' 
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {ann.priority}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{ann.content}</p>
                      <div className="flex items-center justify-between text-[9px] text-slate-400 mt-2">
                        <span>By {ann.postedByUser?.username || 'Admin'}</span>
                        <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 hover:bg-slate-100 rounded-lg transition cursor-pointer"
          title="Toggle theme"
        >
          {isDark ? (
            <Sun size={20} className="text-slate-500 hover:text-slate-900" />
          ) : (
            <Moon size={20} className="text-slate-500 hover:text-slate-900" />
          )}
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-lg transition cursor-pointer dark:hover:bg-slate-800"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">{user.username[0].toUpperCase()}</span>
            </div>
            <span className="text-sm font-bold text-slate-800 hidden sm:block dark:text-slate-200">{user.username}</span>
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50 dark:bg-slate-900 dark:border-slate-800">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-200">{user.username}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
              </div>
              <nav className="py-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition dark:text-slate-300 dark:hover:bg-slate-800"
                  onClick={() => setShowUserMenu(false)}
                >
                  <User size={16} />
                  Profile Settings
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition dark:text-slate-300 dark:hover:bg-slate-800"
                  onClick={() => setShowUserMenu(false)}
                >
                  <Settings size={16} />
                  Preferences
                </Link>
              </nav>
              <div className="p-2 border-t border-border dark:border-slate-800">
                <button
                  onClick={() => {
                    logout();
                    window.location.href = '/login';
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded transition dark:text-rose-400 dark:hover:bg-rose-900/20"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Close Dropdown on Outside Click */}
      {(showUserMenu || showAnnouncementsDropdown) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowUserMenu(false);
            setShowAnnouncementsDropdown(false);
          }}
        />
      )}
    </header>
  );
}
