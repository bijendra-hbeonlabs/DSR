'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { employeesAPI, attendanceAPI, tasksAPI, dsrAPI } from '@/lib/api-client';
import { Employee, Attendance, Task, DSR } from '@/lib/types';
import { Users, ShieldAlert, Award, Calendar, CheckSquare, Clock, FileText, ChevronRight, Eye, Phone, Mail } from 'lucide-react';
import Link from 'next/link';

interface TeamMemberSummary {
  employee: Employee;
  todayAttendance: Attendance | null;
  tasksCount: { total: number; pending: number; completed: number };
  latestDSR: DSR | null;
}

export default function TeamPage() {
  const { token, user } = useAuth();
  const [teamSummaries, setTeamSummaries] = useState<TeamMemberSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTeamData = async () => {
    setIsLoading(true);
    try {
      if (!token || !user) return;

      // 1. Fetch all employees
      const empRes = await employeesAPI.getAll(token);
      const allEmps: Employee[] = Array.isArray(empRes) ? empRes : empRes.data || [];

      // 2. Filter those managed by the current user
      // managerId maps to current user's database ID
      const directReports = allEmps.filter(e => e.managerId === user.id);

      // 3. For each direct report, gather today's attendance, task stats, and latest DSR
      const todayStr = new Date().toISOString().split('T')[0];
      const summaries: TeamMemberSummary[] = await Promise.all(
        directReports.map(async (emp) => {
          let todayAttendance: Attendance | null = null;
          let tasksCount = { total: 0, pending: 0, completed: 0 };
          let latestDSR: DSR | null = null;

          try {
            // Fetch today's attendance for this employee
            const attRes = await attendanceAPI.getAll({ employeeId: emp.id, date: todayStr }, token);
            const attList: Attendance[] = Array.isArray(attRes) ? attRes : attRes.data || [];
            todayAttendance = attList.length > 0 ? attList[0] : null;
          } catch (e) {
            console.error('Failed to fetch attendance for emp id:', emp.id, e);
          }

          try {
            // Fetch tasks assigned to this employee's user ID
            const taskRes = await tasksAPI.getAll({ assignedTo: emp.userId }, token);
            const taskList: Task[] = Array.isArray(taskRes) ? taskRes : taskRes.data || [];
            tasksCount = {
              total: taskList.length,
              pending: taskList.filter(t => t.status !== 'Completed').length,
              completed: taskList.filter(t => t.status === 'Completed').length
            };
          } catch (e) {
            console.error('Failed to fetch tasks for user id:', emp.userId, e);
          }

          try {
            // Fetch DSRs submitted by this employee
            const dsrRes = await dsrAPI.getAll({ employeeId: emp.id }, token);
            const dsrList: DSR[] = Array.isArray(dsrRes) ? dsrRes : dsrRes.data || [];
            latestDSR = dsrList.length > 0 ? dsrList[0] : null;
          } catch (e) {
            console.error('Failed to fetch DSR for emp id:', emp.id, e);
          }

          return {
            employee: emp,
            todayAttendance,
            tasksCount,
            latestDSR
          };
        })
      );

      setTeamSummaries(summaries);
    } catch (error) {
      console.error('Failed to fetch team dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, [token, user]);

  const getAttendanceBadge = (attendance: Attendance | null) => {
    if (!attendance) {
      return (
        <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded font-bold text-xs">
          Not Checked In
        </span>
      );
    }
    const status = attendance.status;
    switch (status) {
      case 'Present':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded font-bold text-xs">Checked In</span>;
      case 'Late':
        return <span className="bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded font-bold text-xs">Late</span>;
      case 'Remote':
      case 'WFH':
        return <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded font-bold text-xs">{status}</span>;
      default:
        return <span className="bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded font-bold text-xs">{status}</span>;
    }
  };

  if (user?.roleName !== 'MANAGER' && user?.roleName !== 'ADMIN' && user?.roleName !== 'SUPER_ADMIN') {
    return (
      <div className="p-8 text-center bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-sm shadow-md">
          <ShieldAlert size={48} className="mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
          <p className="text-slate-500 text-sm mt-2">Only team managers can access the Team Overview dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-slate-50 min-h-screen p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Team</h1>
        <p className="text-slate-500 mt-1">Track active members, tasks progress, and daily logs</p>
      </div>

      {/* Directory summary info */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          Loading team roster data...
        </div>
      ) : teamSummaries.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-16 text-center text-slate-500 shadow-sm">
          <Users size={48} className="mx-auto mb-4 text-slate-300" />
          <h3 className="font-semibold text-slate-700 text-lg">No direct reports found</h3>
          <p className="text-slate-400 mt-1 max-w-md mx-auto">
            You do not have any employees assigned to you in the directory. Work with an Admin to map reporting relationships.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {teamSummaries.map((summary) => {
            const emp = summary.employee;
            const name = `${emp.firstName} ${emp.lastName}`;
            const att = summary.todayAttendance;
            const dsr = summary.latestDSR;

            return (
              <div key={emp.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md transition">
                
                {/* Team Lead Profile Summary */}
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-center text-blue-600 font-black text-lg shadow-sm">
                      {emp.firstName[0]}
                      {emp.lastName[0]}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">{name}</h2>
                      <p className="text-xs text-slate-500 font-semibold">{emp.designation?.name || 'Developer'}</p>
                      
                      <div className="flex gap-4 mt-2 text-xs text-slate-400 font-semibold">
                        <span className="flex items-center gap-1"><Mail size={12}/> {emp.email}</span>
                        {emp.phone && <span className="flex items-center gap-1"><Phone size={12}/> {emp.phone}</span>}
                      </div>
                    </div>
                  </div>
                  {getAttendanceBadge(att)}
                </div>

                {/* Progress Indicators */}
                <div className="grid grid-cols-3 gap-4 border-y border-slate-100 py-4">
                  <div className="text-center">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wide">Pending Tasks</p>
                    <p className="text-xl font-black text-slate-700 mt-1 flex items-center justify-center gap-1">
                      <CheckSquare size={14} className="text-slate-400"/>
                      {summary.tasksCount.pending}
                    </p>
                  </div>
                  <div className="text-center border-x border-slate-100">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wide">Completed Tasks</p>
                    <p className="text-xl font-black text-emerald-600 mt-1 flex items-center justify-center gap-1">
                      <Award size={14} className="text-emerald-400"/>
                      {summary.tasksCount.completed}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wide">Today Check-In</p>
                    <p className="text-xs font-bold text-slate-700 mt-2 flex items-center justify-center gap-1">
                      <Clock size={12} className="text-slate-400" />
                      {att?.checkInTime ? att.checkInTime.slice(0, 5) : '--:--'}
                    </p>
                  </div>
                </div>

                {/* Latest Status Log */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/60">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wide mb-2">
                    <span className="flex items-center gap-1"><FileText size={12}/> Latest DSR Entry</span>
                    {dsr && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">{new Date(dsr.date).toLocaleDateString()}</span>}
                  </div>
                  {dsr ? (
                    <div>
                      <p className="text-sm font-semibold text-slate-700 line-clamp-2">
                        {dsr.workDescription || 'No description entered'}
                      </p>
                      {dsr.tomorrowsPlan && (
                        <p className="text-xs text-slate-400 mt-1 font-medium italic line-clamp-1">
                          Next: {dsr.tomorrowsPlan}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No daily status reports submitted yet.</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    href={`/tasks?assignedTo=${emp.userId}`}
                    className="flex-1 text-center py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    View Tasks
                  </Link>
                  <Link
                    href="/dsr"
                    className="flex-1 text-center py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Review Logs
                  </Link>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
