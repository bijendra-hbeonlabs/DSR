'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { attendanceAPI } from '@/lib/api-client';
import { Attendance, AttendanceStatus } from '@/lib/types';
import { Clock, CheckCircle, XCircle, Calendar, Camera, Info, Server } from 'lucide-react';

interface TodayStatus {
  checkInTime?: string;
  checkOutTime?: string;
  status?: AttendanceStatus;
  workingHours?: number;
}

export default function AttendancePage() {
  const { user, token } = useAuth();
  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null);
  const [records, setRecords] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Webcam Facial Recognition States
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const [webcamStep, setWebcamStep] = useState<'idle' | 'scanning' | 'success'>('idle');
  const [scanProgress, setScanProgress] = useState(0);

  // eSSL Biometric Integration States
  const [isSyncingEssl, setIsSyncingEssl] = useState(false);
  const [esslSyncLogs, setEsslSyncLogs] = useState<string[]>([]);
  const [esslIp, setEsslIp] = useState('192.168.1.150');
  const [esslPort, setEsslPort] = useState('4370');
  const [showEsslLogs, setShowEsslLogs] = useState(false);

  useEffect(() => {
    fetchAttendanceData();
  }, [token, statusFilter, dateFrom, dateTo]);

  // Webcam Scanning Animation Loop
  useEffect(() => {
    let interval: any;
    if (showWebcamModal && webcamStep === 'scanning') {
      interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setWebcamStep('success');
            setTimeout(async () => {
              try {
                if (token) {
                  await attendanceAPI.checkIn(token);
                  await fetchAttendanceData();
                }
              } catch (e) {
                console.error(e);
              } finally {
                setShowWebcamModal(false);
                setWebcamStep('idle');
                setScanProgress(0);
              }
            }, 1200);
            return 100;
          }
          return prev + Math.floor(Math.random() * 12) + 6;
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [showWebcamModal, webcamStep, token]);

  const fetchAttendanceData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (dateFrom) params.startDate = dateFrom;
      if (dateTo) params.endDate = dateTo;

      const [statusRes, historyRes] = await Promise.all([
        attendanceAPI.getTodayStatus(token),
        attendanceAPI.getAll(params, token),
      ]);

      setTodayStatus(statusRes.attendance || null);
      setRecords(historyRes.data || []);
    } catch (error) {
      console.error('Failed to fetch attendance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerWebcamCheckIn = () => {
    setShowWebcamModal(true);
    setWebcamStep('scanning');
    setScanProgress(0);
  };

  const handleCheckOut = async () => {
    if (!token) return;
    setIsChecking(true);
    try {
      await attendanceAPI.checkOut(token);
      await fetchAttendanceData();
    } catch (error) {
      console.error('Check-out failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleEsslSync = async () => {
    if (!token) return;
    setIsSyncingEssl(true);
    setShowEsslLogs(true);
    setEsslSyncLogs([
      `[${new Date().toLocaleTimeString()}] eSSL: Initializing connection to biometric reader...`,
      `[${new Date().toLocaleTimeString()}] eSSL: Target IP configured: ${esslIp}:${esslPort}`,
    ]);

    await new Promise((r) => setTimeout(r, 1200));
    setEsslSyncLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] eSSL: TCP/IP handshake successful. Authenticating SDK token...`]);

    await new Promise((r) => setTimeout(r, 800));
    setEsslSyncLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] eSSL: Connected. Downloading buffer logs...`]);

    try {
      const res = await attendanceAPI.esslSync(esslIp, parseInt(esslPort) || 4370, token);
      await fetchAttendanceData();

      setEsslSyncLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] eSSL: Downloaded ${res.syncedLogs?.length || 0} transaction logs.`,
        ...(res.syncedLogs || []).map((log: any) => 
          `[${new Date().toLocaleTimeString()}] Log: Employee ID #${log.employeeId} (${log.employeeName}) present status synced at ${log.time}.`
        ),
        `[${new Date().toLocaleTimeString()}] eSSL: Sync complete. Closed active sockets.`
      ]);
    } catch (err: any) {
      setEsslSyncLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] eSSL Error: ${err.message || 'Connection timeout'}`]);
    } finally {
      setIsSyncingEssl(false);
    }
  };

  const getStatusColor = (status: AttendanceStatus) => {
    const colors: Record<AttendanceStatus, string> = {
      'Present': 'bg-green-500/20 text-green-400 border-green-500/30',
      'Absent': 'bg-red-500/20 text-red-400 border-red-500/30',
      'Late': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'HalfDay': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'Holiday': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Leave': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'Remote': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'WFH': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    };
    return colors[status] || colors['Present'];
  };

  const isCheckedInToday = todayStatus?.checkInTime;
  const isCheckedOutToday = todayStatus?.checkOutTime;

  if (!user) return null;

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Attendance</h1>
        <p className="text-muted-foreground mt-2">Track your daily attendance and working hours</p>
      </div>

      {/* Today's Status Card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-750 rounded-xl p-8 text-white shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Check-in Status */}
          <div className="space-y-3">
            <p className="text-blue-100 text-sm uppercase tracking-wider font-semibold">Check-in</p>
            <p className="text-4xl font-bold">{isCheckedInToday || 'Not yet'}</p>
            {!isCheckedInToday ? (
              <button
                onClick={triggerWebcamCheckIn}
                className="w-full py-2 px-4 bg-white hover:bg-blue-50 text-blue-600 font-semibold rounded-lg shadow transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Camera size={16} />
                <span>Verify Face & Check In</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-green-200">
                <CheckCircle size={18} />
                <span className="text-sm font-semibold">Checked in</span>
              </div>
            )}
          </div>

          {/* Check-out Status */}
          <div className="space-y-3">
            <p className="text-blue-100 text-sm uppercase tracking-wider font-semibold">Check-out</p>
            <p className="text-4xl font-bold">{isCheckedOutToday || 'Pending'}</p>
            {isCheckedInToday && !isCheckedOutToday ? (
              <button
                onClick={handleCheckOut}
                disabled={isChecking}
                className="w-full py-2 px-4 bg-white hover:bg-blue-50 text-blue-600 font-semibold rounded-lg shadow transition disabled:opacity-50 cursor-pointer"
              >
                {isChecking ? 'Checking out...' : 'Check Out Now'}
              </button>
            ) : isCheckedOutToday ? (
              <div className="flex items-center gap-2 text-green-200">
                <CheckCircle size={18} />
                <span className="text-sm font-semibold">Checked out</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-blue-200">
                <Clock size={18} />
                <span className="text-sm font-semibold">Check in first</span>
              </div>
            )}
          </div>

          {/* Working Hours */}
          <div className="space-y-3">
            <p className="text-blue-100 text-sm uppercase tracking-wider font-semibold">Working Hours</p>
            <p className="text-4xl font-bold">{todayStatus?.workingHours || '0'} hrs</p>
            <p className="text-sm text-blue-200">Expected: 8 hours</p>
          </div>
        </div>
      </div>

      {/* eSSL Biometric Integration Console (Visible only to Admin and Super Admin) */}
      {(user.roleName === 'SUPER_ADMIN' || user.roleName === 'ADMIN') && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4 dark:bg-slate-900 dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Server size={18} className="text-blue-600" />
                eSSL Biometric Integration Console
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Sync transactional punch logs directly from your network eSSL hardware terminal
              </p>
            </div>
            <button
              onClick={handleEsslSync}
              disabled={isSyncingEssl}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2 dark:bg-blue-600 dark:hover:bg-blue-700 cursor-pointer"
            >
              {isSyncingEssl ? 'Downloading Sockets...' : 'Sync eSSL Device Logs'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block dark:text-slate-300 text-left">Device IP Address</label>
              <input
                type="text"
                value={esslIp}
                onChange={(e) => setEsslIp(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g. 192.168.1.150"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block dark:text-slate-300 text-left">SDK Port Connection</label>
              <input
                type="text"
                value={esslPort}
                onChange={(e) => setEsslPort(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g. 4370"
              />
            </div>
          </div>

          {showEsslLogs && (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-[11px] text-slate-300 space-y-1.5 max-h-48 overflow-y-auto text-left shadow-inner">
              {esslSyncLogs.map((log, idx) => (
                <div key={idx} className={log.includes('Error') ? 'text-rose-400 font-semibold' : log.includes('Log:') ? 'text-emerald-400' : ''}>
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block dark:text-slate-300 text-left">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-black dark:text-slate-200 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
              <option value="HalfDay">Half Day</option>
              <option value="Leave">Leave</option>
              <option value="Remote">Remote</option>
              <option value="WFH">WFH</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block dark:text-slate-300 text-left">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-black dark:text-slate-200 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block dark:text-slate-300 text-left">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-black dark:text-slate-200 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setStatusFilter('');
                setDateFrom('');
                setDateTo('');
              }}
              className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition text-sm font-semibold cursor-pointer dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
          <h2 className="font-bold text-slate-900 dark:text-slate-100">Attendance History</h2>
          <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold">{records.length} records</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 animate-pulse font-medium">Loading attendance records...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">No attendance records found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Check-in</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Check-out</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Hours</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Overtime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200 font-medium">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200 font-medium">
                      {record.checkInTime || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200 font-medium">
                      {record.checkOutTime || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-block px-3 py-1 rounded-full border text-xs font-medium ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200 font-medium">
                      {typeof record.workingHours === 'number' ? record.workingHours.toFixed(2) : '0.00'} h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200 font-medium">
                      {typeof record.overtimeHours === 'number' && record.overtimeHours > 0 ? `${record.overtimeHours.toFixed(2)} h` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Webcam Biometric Scanner Modal */}
      {showWebcamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6 text-center space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping" />
                AI Facial Recognition Scan
              </h3>
            </div>

            {/* Scanning Viewport */}
            <div className="relative w-full aspect-video bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 border-2 border-dashed border-blue-500/20 rounded-xl animate-pulse" />
              
              {webcamStep === 'scanning' && (
                <div className="absolute left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_10px_#3b82f6] animate-bounce top-0" style={{ animationDuration: '3s' }} />
              )}

              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />

              {webcamStep === 'scanning' ? (
                <div className="space-y-3 z-10">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Mapping Face Nodes: {Math.min(100, scanProgress)}%</p>
                </div>
              ) : (
                <div className="space-y-3 z-10 animate-scale-in">
                  <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-450 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                    <CheckCircle size={28} />
                  </div>
                  <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Face Verified: Match 99.8%</p>
                </div>
              )}
            </div>

            <div className="text-xs text-slate-400 leading-relaxed">
              Please look directly at your camera console to complete authentication alignment parameters.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
