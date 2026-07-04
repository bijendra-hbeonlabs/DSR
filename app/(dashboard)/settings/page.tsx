'use client';

import { useAuth } from '@/lib/auth-context';
import { useState } from 'react';
import { Settings, Sun, Moon, Bell, Shield, ToggleLeft, ToggleRight, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [taskAlerts, setTaskAlerts] = useState(true);
  const [dsrReminder, setDsrReminder] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSaveSettings = () => {
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 2000);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-8 bg-slate-50 min-h-screen p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Preferences</h1>
        <p className="text-slate-500 mt-1">Configure layout themes and alert notification schedules</p>
      </div>

      {showSuccess && (
        <div className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={14} />
          Settings saved successfully!
        </div>
      )}

      {/* Preferences Block */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        
        {/* Theme Settings */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Sun size={16} className="text-slate-400" /> Display Theme
          </h2>
          <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 border border-slate-200/60">
            <div>
              <p className="text-sm font-bold text-slate-700">Dark Interface Mode</p>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Toggle background color schemes</p>
            </div>
            <button 
              onClick={toggleTheme}
              className="p-2 hover:bg-slate-200 rounded-lg transition text-slate-500"
            >
              {theme === 'dark' ? <Moon size={20} className="text-blue-600"/> : <Sun size={20}/>}
            </button>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Bell size={16} className="text-slate-400" /> Notification Broadcasts
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 border border-slate-200/60">
              <div>
                <p className="text-sm font-bold text-slate-700">Task Assignments</p>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Get notified when a manager assigns you a new task</p>
              </div>
              <button onClick={() => setTaskAlerts(!taskAlerts)} className="text-blue-600 cursor-pointer">
                {taskAlerts ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-slate-300" />}
              </button>
            </div>

            <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 border border-slate-200/60">
              <div>
                <p className="text-sm font-bold text-slate-700">DSR Submission Reminder</p>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Receive daily notifications to submit status reports at EOD</p>
              </div>
              <button onClick={() => setDsrReminder(!dsrReminder)} className="text-blue-600 cursor-pointer">
                {dsrReminder ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-slate-300" />}
              </button>
            </div>

            <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 border border-slate-200/60">
              <div>
                <p className="text-sm font-bold text-slate-700">Corporate Email Alerts</p>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Allow system to dispatch summary reports via email</p>
              </div>
              <button onClick={() => setEmailAlerts(!emailAlerts)} className="text-blue-600 cursor-pointer">
                {emailAlerts ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-slate-300" />}
              </button>
            </div>
          </div>
        </div>

        {/* Security Summary details */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Shield size={16} className="text-slate-400" /> Account Security Access
          </h2>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-xs font-semibold text-slate-500">
              Your account uses JWT session key authorization valid for 7 days. Password updates can be performed under the profile screen settings.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleSaveSettings}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition font-bold text-sm shadow-md cursor-pointer"
          >
            Save Preferences
          </button>
        </div>

      </div>
    </div>
  );
}
