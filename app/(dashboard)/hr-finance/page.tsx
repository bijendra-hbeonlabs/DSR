'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { employeesAPI, attendanceAPI, leavesAPI } from '@/lib/api-client';
import { Employee, Attendance } from '@/lib/types';
import {
  FileText, DollarSign, Award, Users, Plus, Star,
  CheckCircle, Printer, Scale, Sliders, Mail,
  RefreshCw, Building2, CalendarDays, BadgeCheck,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Candidate {
  id: string; name: string; role: string;
  stage: 'Applied' | 'Screened' | 'Technical' | 'HR' | 'Offered';
  experience: string; interviewerScore: number;
}

interface Appraisal {
  id: string; employeeName: string; role: string;
  techRating: number; commRating: number; leadRating: number;
  deliveryRating: number; overallRating: number;
  remarks: string; goals: string;
}

interface AttendanceSummary {
  presentDays: number; absentDays: number; leaveDays: number;
  halfDays: number; lateDays: number; totalWorkingDays: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const currentMonthYear = new Date().toLocaleDateString('en-IN', {
  month: 'long', year: 'numeric',
});

const inputCls = 'w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-950 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200 text-slate-800';
const labelCls = 'text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1 text-left';

// ── Component ─────────────────────────────────────────────────────────────────
export default function HRFinancePage() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'payslips' | 'tax' | 'appraisals' | 'recruitment'>('payslips');

  // ── Employee list ───────────────────────────────────────────────────────────
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [loadingEmp, setLoadingEmp] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        setLoadingEmp(true);
        const resp = await employeesAPI.getAll(token);
        const list: Employee[] = Array.isArray(resp) ? resp : resp.data ?? resp.employees ?? [];
        setEmployees(list);
        if (list.length > 0) setSelectedEmp(list[0]);
      } catch (e) { console.error('employees fetch', e); }
      finally { setLoadingEmp(false); }
    };
    load();
  }, [token]);

  // ── Payslip salary inputs ──────────────────────────────────────────────────
  const [payslipMonth, setPayslipMonth] = useState(currentMonthYear);
  const [payslipPAN, setPayslipPAN]     = useState('ABCDE1234F');
  const [payslipBankAcc, setPayslipBankAcc] = useState('XXXX-XXXX-8943');
  const [payslipUAN, setPayslipUAN]     = useState('100123456789');
  const [grossSalary, setGrossSalary]   = useState(85000);
  const [allowanceHRA, setAllowanceHRA] = useState(20000);
  const [allowanceSpecial, setAllowanceSpecial] = useState(10000);
  const [allowanceMedical, setAllowanceMedical] = useState(1250);
  const [allowanceConveyance, setAllowanceConveyance] = useState(1600);
  const [allowanceLTA, setAllowanceLTA] = useState(2000);
  const [deductionPF, setDeductionPF]   = useState(6000);
  const [deductionESI, setDeductionESI] = useState(1200);
  const [deductionTax, setDeductionTax] = useState(8500);
  const [deductionProfTax, setDeductionProfTax] = useState(200);
  const [showSlip, setShowSlip]         = useState(false);

  // ── Real attendance (fetched from DB) ──────────────────────────────────────
  const [attendance, setAttendance] = useState<AttendanceSummary>({
    presentDays: 0, absentDays: 0, leaveDays: 0,
    halfDays: 0, lateDays: 0, totalWorkingDays: 26,
  });
  const [loadingAtt, setLoadingAtt] = useState(false);
  const [attFetched, setAttFetched] = useState(false);

  const fetchAttendance = useCallback(async (emp: Employee) => {
    if (!token) return;
    setLoadingAtt(true);
    try {
      const now   = new Date();
      const y     = now.getFullYear();
      const m     = now.getMonth() + 1;
      const pad   = (n: number) => String(n).padStart(2, '0');
      const start = `${y}-${pad(m)}-01`;
      const days  = new Date(y, m, 0).getDate();
      const end   = `${y}-${pad(m)}-${days}`;

      // Attendance — filter by employeeId (the Employee.id, not User.id)
      const attResp = await attendanceAPI.getAll(
        { startDate: start, endDate: end, employeeId: emp.id, limit: 100 },
        token
      );
      const records: Attendance[] = Array.isArray(attResp)
        ? attResp
        : attResp.data ?? attResp.attendance ?? [];

      let present = 0, absent = 0, half = 0, late = 0;
      records.forEach((r: Attendance) => {
        const s = r.status;
        if (s === 'Present' || s === 'Remote' || s === 'WFH') present++;
        else if (s === 'Absent') absent++;
        else if (s === 'HalfDay') { half++; present += 0.5; }
        else if (s === 'Late') { late++; present++; }
      });

      // Leaves this month — filter by employeeId
      const lvResp = await leavesAPI.getAll(
        { employeeId: emp.id, status: 'Approved', startDate: start, endDate: end, limit: 100 },
        token
      );
      const leaveRecords: any[] = Array.isArray(lvResp)
        ? lvResp
        : lvResp.data ?? lvResp.leaves ?? [];

      let leaveDays = 0;
      leaveRecords.forEach((l: any) => {
        const s2 = new Date(l.startDate), e2 = new Date(l.endDate);
        leaveDays += Math.round((e2.getTime() - s2.getTime()) / 86400000) + 1;
      });

      // Working days = weekdays in the month
      let workingDays = 0;
      for (let d = 1; d <= days; d++) {
        const dow = new Date(y, m - 1, d).getDay();
        if (dow !== 0 && dow !== 6) workingDays++;
      }

      setAttendance({
        presentDays: Math.round(present),
        absentDays: absent,
        leaveDays,
        halfDays: half,
        lateDays: late,
        totalWorkingDays: workingDays,
      });
      setAttFetched(true);
    } catch (e) {
      console.error('attendance fetch error', e);
    } finally {
      setLoadingAtt(false);
    }
  }, [token]);

  // Auto-fetch whenever selected employee changes
  useEffect(() => {
    if (selectedEmp) {
      setAttFetched(false);
      fetchAttendance(selectedEmp);
    }
  }, [selectedEmp, fetchAttendance]);

  // ── Derived payslip numbers ─────────────────────────────────────────────────
  const grossEarnings   = grossSalary + allowanceHRA + allowanceSpecial + allowanceMedical + allowanceConveyance + allowanceLTA;
  const totalDeductions = deductionPF + deductionESI + deductionTax + deductionProfTax;
  const perDay          = attendance.totalWorkingDays > 0 ? grossSalary / attendance.totalWorkingDays : 0;
  const lopDays         = attendance.absentDays;
  const lopDeduction    = Math.round(perDay * lopDays);
  const netPay          = grossEarnings - totalDeductions - lopDeduction;
  const employerPF      = Math.round(grossSalary * 0.12);
  const employerESI     = Math.round(grossSalary * 0.0325);
  const annualCTC       = (netPay + totalDeductions + lopDeduction + employerPF + employerESI) * 12;

  // ── Helper: safe string fields from Employee ────────────────────────────────
  const empName       = selectedEmp ? `${selectedEmp.firstName} ${selectedEmp.lastName}` : '—';
  const empCode       = selectedEmp ? `HBEON-${String(selectedEmp.id).padStart(4, '0')}` : '—';
  const empDesig      = selectedEmp?.designation?.name ?? selectedEmp?.designationId ? 'N/A' : 'Software Engineer';
  const empDept       = selectedEmp?.department?.name ?? 'Engineering';
  const empJoin       = selectedEmp?.joinDate
    ? new Date(selectedEmp.joinDate).toLocaleDateString('en-IN') : 'N/A';

  // ── Tax Declarations ────────────────────────────────────────────────────────
  const [sec80C, setSec80C]           = useState(150000);
  const [sec80D, setSec80D]           = useState(25000);
  const [rentPaid, setRentPaid]       = useState(120000);
  const [otherIncome, setOtherIncome] = useState(20000);
  const [taxReport, setTaxReport]     = useState<{
    grossAnnual: number; totalDeductions: number;
    taxableIncome: number; taxLiability: number;
  } | null>(null);

  const handleCalcTax = () => {
    const grossAnnual    = grossSalary * 12 + otherIncome;
    const stdDed         = 50000;
    const totalDeds      = Math.min(150000, sec80C) + Math.min(25000, sec80D)
                         + Math.min(60000, rentPaid * 0.4) + stdDed;
    const taxableIncome  = Math.max(0, grossAnnual - totalDeds);
    let taxLiability     = 0;
    if      (taxableIncome > 1000000) taxLiability = (taxableIncome - 1000000) * 0.20 + 75000;
    else if (taxableIncome > 500000)  taxLiability = (taxableIncome - 500000)  * 0.10 + 12500;
    else if (taxableIncome > 250000)  taxLiability = (taxableIncome - 250000)  * 0.05;
    setTaxReport({ grossAnnual, totalDeductions: totalDeds, taxableIncome, taxLiability });
  };

  // ── Appraisals ──────────────────────────────────────────────────────────────
  const [appraisals, setAppraisals] = useState<Appraisal[]>([
    { id: '1', employeeName: 'Alice Smith',  role: 'Software Engineer', techRating: 4, commRating: 5, leadRating: 3, deliveryRating: 4, overallRating: 4, remarks: 'Excellent delivery on mobile features.', goals: 'Lead backend Node migration' },
    { id: '2', employeeName: 'Bob Johnson',  role: 'UI Developer',      techRating: 5, commRating: 5, leadRating: 5, deliveryRating: 5, overallRating: 5, remarks: 'Stunning dashboard designs.',            goals: 'Design core component library' },
  ]);
  const [appName, setAppName]               = useState('');
  const [appRole, setAppRole]               = useState('');
  const [techRating, setTechRating]         = useState(4);
  const [commRating, setCommRating]         = useState(4);
  const [leadRating, setLeadRating]         = useState(3);
  const [deliveryRating, setDeliveryRating] = useState(4);
  const [appRemarks, setAppRemarks]         = useState('');
  const [appGoals, setAppGoals]             = useState('');

  const handleAddAppraisal = () => {
    if (!appName || !appRole) return;
    const overall = Math.round((techRating + commRating + leadRating + deliveryRating) / 4);
    setAppraisals([{ id: Date.now().toString(), employeeName: appName, role: appRole, techRating, commRating, leadRating, deliveryRating, overallRating: overall, remarks: appRemarks, goals: appGoals }, ...appraisals]);
    setAppName(''); setAppRole(''); setAppRemarks(''); setAppGoals('');
  };

  // ── ATS Recruitment ─────────────────────────────────────────────────────────
  const [candidates, setCandidates] = useState<Candidate[]>([
    { id: 'c1', name: 'Robert Downey', role: 'Senior React Developer', stage: 'Applied',   experience: '5 Years', interviewerScore: 8 },
    { id: 'c2', name: 'Diana Prince',  role: 'Node JS Architect',      stage: 'Screened',  experience: '8 Years', interviewerScore: 9 },
    { id: 'c3', name: 'Ethan Hunt',    role: 'QA Lead Engineer',       stage: 'Technical', experience: '6 Years', interviewerScore: 7 },
    { id: 'c4', name: 'Sanjay Kumar',  role: 'Full Stack Developer',   stage: 'HR',        experience: '4 Years', interviewerScore: 8.5 },
  ]);
  const [candName, setCandName]   = useState('');
  const [candRole, setCandRole]   = useState('');
  const [candExp, setCandExp]     = useState('');
  const [candScore, setCandScore] = useState(8);

  const addCandidate = () => {
    if (!candName || !candRole) return;
    setCandidates([...candidates, { id: Date.now().toString(), name: candName, role: candRole, stage: 'Applied', experience: candExp || 'N/A', interviewerScore: candScore }]);
    setCandName(''); setCandRole(''); setCandExp(''); setCandScore(8);
  };
  const moveStage = (id: string, stage: Candidate['stage']) =>
    setCandidates(candidates.map(c => c.id === id ? { ...c, stage } : c));

  if (!user) return null;

  // ── Print ───────────────────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 min-h-screen p-2">
      {/* Page title */}
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Human Capital &amp; Payroll Operations
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage payslip distributions, tax exemptions, performance appraisals, and candidate pipelines
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto pb-px print:hidden">
        {([
          { key: 'payslips', label: 'Payslip Builder',       icon: DollarSign },
          { key: 'tax',      label: 'Tax Declarations',      icon: Scale      },
          { key: 'appraisals', label: 'Performance Appraisals', icon: Award   },
          { key: 'recruitment', label: 'ATS Recruitment',    icon: Users      },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === key
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          ><Icon size={14} /> {label}</button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          TAB 1 — PAYSLIP BUILDER
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'payslips' && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

          {/* ── LEFT: Input Panel ── */}
          <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-5 print:hidden">
            <h3 className="text-base font-bold border-b pb-2 dark:border-slate-800 flex items-center gap-2">
              <Sliders size={15} className="text-blue-500" /> Salary Parameters
            </h3>

            {/* Employee selector */}
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Select Employee</label>
                {loadingEmp ? (
                  <div className="h-9 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                ) : (
                  <select
                    value={selectedEmp?.id ?? ''}
                    onChange={e => {
                      const emp = employees.find(x => x.id === Number(e.target.value));
                      if (emp) setSelectedEmp(emp);
                    }}
                    className={inputCls}
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                        {emp.designation?.name ? ` – ${emp.designation.name}` : ''}
                      </option>
                    ))}
                    {employees.length === 0 && <option value="">No employees found</option>}
                  </select>
                )}
              </div>

              {selectedEmp && (
                <div className="grid grid-cols-3 gap-2 text-[10px] bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg">
                  <div><span className="text-slate-400 font-bold block">Department</span><span className="font-bold text-slate-700 dark:text-slate-200">{empDept}</span></div>
                  <div><span className="text-slate-400 font-bold block">Designation</span><span className="font-bold text-slate-700 dark:text-slate-200">{empDesig}</span></div>
                  <div><span className="text-slate-400 font-bold block">Joined</span><span className="font-bold text-slate-700 dark:text-slate-200">{empJoin}</span></div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Pay Month</label>
                  <input type="text" value={payslipMonth} onChange={e => setPayslipMonth(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Employee Code</label>
                  <input type="text" value={empCode} readOnly className={inputCls + ' bg-slate-50 dark:bg-slate-950/40'} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>PAN Number</label>
                  <input type="text" value={payslipPAN} onChange={e => setPayslipPAN(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>UAN (PF)</label>
                  <input type="text" value={payslipUAN} onChange={e => setPayslipUAN(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Bank Account (masked)</label>
                <input type="text" value={payslipBankAcc} onChange={e => setPayslipBankAcc(e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* Earnings inputs */}
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">Earnings</p>
              <div className="space-y-1.5">
                {([
                  ['Basic Salary',            grossSalary,       setGrossSalary],
                  ['HRA Allowance',           allowanceHRA,      setAllowanceHRA],
                  ['Special Allowance',       allowanceSpecial,  setAllowanceSpecial],
                  ['Medical Allowance',       allowanceMedical,  setAllowanceMedical],
                  ['Conveyance Allowance',    allowanceConveyance, setAllowanceConveyance],
                  ['Leave Travel Allowance',  allowanceLTA,      setAllowanceLTA],
                ] as [string, number, (v: number) => void][]).map(([lbl, val, set]) => (
                  <div key={lbl} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-44 flex-shrink-0">{lbl} (₹)</span>
                    <input type="number" value={val}
                      onChange={e => set(Number(e.target.value))}
                      className="flex-1 px-2 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-950 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                ))}
              </div>
            </div>

            {/* Deductions inputs */}
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">Deductions</p>
              <div className="space-y-1.5">
                {([
                  ['Provident Fund (PF)', deductionPF,       setDeductionPF],
                  ['ESI Contribution',    deductionESI,      setDeductionESI],
                  ['Income Tax (TDS)',    deductionTax,      setDeductionTax],
                  ['Professional Tax',   deductionProfTax,  setDeductionProfTax],
                ] as [string, number, (v: number) => void][]).map(([lbl, val, set]) => (
                  <div key={lbl} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-44 flex-shrink-0">{lbl} (₹)</span>
                    <input type="number" value={val}
                      onChange={e => set(Number(e.target.value))}
                      className="flex-1 px-2 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-950 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                ))}
              </div>
            </div>

            {/* ── Real-time Attendance Panel ── */}
            <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Attendance — {payslipMonth}
                  {attFetched && <span className="ml-2 text-[9px] text-emerald-500 font-bold">● LIVE</span>}
                </p>
                <button onClick={() => selectedEmp && fetchAttendance(selectedEmp)}
                  disabled={loadingAtt}
                  className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition cursor-pointer disabled:opacity-40">
                  <RefreshCw size={11} className={loadingAtt ? 'animate-spin text-blue-500' : 'text-slate-500'} />
                </button>
              </div>

              {loadingAtt ? (
                <div className="grid grid-cols-3 gap-2">
                  {Array(6).fill(0).map((_, i) => (
                    <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                  {([
                    ['Working Days', attendance.totalWorkingDays, 'text-slate-700 dark:text-slate-200'],
                    ['Present',      attendance.presentDays,      'text-emerald-600'],
                    ['Absent',       attendance.absentDays,       'text-rose-600'],
                    ['Leaves',       attendance.leaveDays,        'text-amber-600'],
                    ['Half Days',    attendance.halfDays,         'text-indigo-600'],
                    ['Late In',      attendance.lateDays,         'text-orange-500'],
                  ] as [string, number, string][]).map(([lbl, val, cls]) => (
                    <div key={lbl} className="bg-slate-50 dark:bg-slate-950 rounded-lg p-2 border dark:border-slate-800">
                      <p className={`text-base font-black ${cls}`}>{val}</p>
                      <p className="text-slate-400 font-semibold mt-0.5 text-[9px]">{lbl}</p>
                    </div>
                  ))}
                </div>
              )}

              {!loadingAtt && lopDays > 0 && (
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-lg px-3 py-2 text-[10px] text-rose-600 dark:text-rose-400 font-bold">
                  ⚠ LOP Deduction: {lopDays} day(s) × ₹{Math.round(perDay).toLocaleString()} = –₹{lopDeduction.toLocaleString()}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowSlip(true)}
              disabled={!selectedEmp || loadingEmp}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition font-bold text-sm shadow cursor-pointer"
            >
              Generate Payslip Preview
            </button>
          </div>

          {/* ── RIGHT: A4 Payslip Preview ── */}
          <div className="xl:col-span-3">
            {!showSlip ? (
              <div className="flex flex-col items-center justify-center gap-4 py-24 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm print:hidden">
                <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-full">
                  <FileText size={48} className="text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-slate-600 dark:text-slate-300 font-bold text-lg">No Active Payslip Preview</p>
                <p className="text-xs text-slate-400 max-w-xs">
                  Select an employee, configure salary parameters and click <strong>Generate Payslip Preview</strong>.
                </p>
              </div>
            ) : (
              <div>
                {/* Print action bar */}
                <div className="flex justify-between items-center mb-3 print:hidden">
                  <button type="button" onClick={() => setShowSlip(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold cursor-pointer">
                    ← Back
                  </button>
                  <button type="button" onClick={handlePrint}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow transition cursor-pointer">
                    <Printer size={14} /> Print / Save as PDF
                  </button>
                </div>

                {/* ══ A4 Payslip  id="payslip-a4" (targeted by globals.css @media print) ══ */}
                <div id="payslip-a4" className="bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 overflow-hidden"
                  style={{ maxWidth: '794px', margin: '0 auto', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11px' }}>

                  {/* Header band */}
                  <div style={{ background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', padding: '20px 28px', color: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '0.02em' }}>HBEONLABS PVT. LTD.</div>
                        <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>Technology Pvt. Ltd. · CIN: U72900DL2018PTC329xxx</div>
                        <div style={{ fontSize: '10px', marginTop: '5px', opacity: 0.85 }}>
                          📍 Sector 62, Noida – 201309 &nbsp;·&nbsp; 📞 +91-120-XXXXXXX &nbsp;·&nbsp; 🌐 hbeonlabs.com
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85 }}>SALARY SLIP</div>
                        <div style={{ fontSize: '18px', fontWeight: '900', marginTop: '2px' }}>{payslipMonth}</div>
                        <div style={{ fontSize: '9px', opacity: 0.7, marginTop: '3px' }}>Generated: {new Date().toLocaleDateString('en-IN')}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                    {/* ── Employee Info Grid ── */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 18px' }}>
                      <div style={{ fontSize: '8.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '10px' }}>Employee Information</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                        {[
                          ['Employee Name',  empName],
                          ['Employee Code',  empCode],
                          ['Designation',    empDesig],
                          ['Department',     empDept],
                          ['Date of Joining', empJoin],
                          ['PAN Number',     payslipPAN],
                          ['UAN (PF)',       payslipUAN],
                          ['Bank Account',   payslipBankAcc],
                          ['Payment Mode',   'Bank Transfer (NEFT)'],
                        ].map(([lbl, val]) => (
                          <div key={lbl}>
                            <div style={{ fontSize: '8px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>{lbl}</div>
                            <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#1e293b', marginTop: '2px' }}>{val}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Real-Time Attendance Summary ── */}
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ fontSize: '8.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1d4ed8' }}>
                          Attendance Summary — {payslipMonth}
                        </div>
                        <div style={{ fontSize: '8px', color: '#059669', fontWeight: '800' }}>● LIVE FROM DATABASE</div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '8px', textAlign: 'center' }}>
                        {([
                          ['Working Days', attendance.totalWorkingDays, '#1e293b'],
                          ['Present',      attendance.presentDays,      '#059669'],
                          ['Absent',       attendance.absentDays,       '#e11d48'],
                          ['Leave Days',   attendance.leaveDays,        '#d97706'],
                          ['Half Days',    attendance.halfDays,         '#7c3aed'],
                          ['Late Arrivals', attendance.lateDays,        '#ea580c'],
                        ] as [string, number, string][]).map(([lbl, val, color]) => (
                          <div key={lbl} style={{ background: '#fff', borderRadius: '6px', padding: '8px 4px', border: '1px solid #e0e7ff' }}>
                            <div style={{ fontSize: '18px', fontWeight: '900', color }}>{val}</div>
                            <div style={{ fontSize: '7px', color: '#64748b', fontWeight: '700', marginTop: '2px' }}>{lbl}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Earnings & Deductions Table ── */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                      <thead>
                        <tr style={{ background: '#1e293b', color: '#fff' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '700' }}>Earnings Component</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>Amount (₹)</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '700', borderLeft: '1px solid #334155' }}>Deduction Component</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {([
                          ['Basic Salary',                grossSalary,        'Provident Fund (12%)',      deductionPF],
                          ['House Rent Allowance (HRA)',  allowanceHRA,       'ESI Contribution (0.75%)', deductionESI],
                          ['Special Allowance',           allowanceSpecial,   'Income Tax (TDS)',          deductionTax],
                          ['Medical Allowance',           allowanceMedical,   'Professional Tax',          deductionProfTax],
                          ['Conveyance Allowance',        allowanceConveyance, lopDays > 0 ? `LOP (${lopDays} days)` : '—', lopDays > 0 ? lopDeduction : 0],
                          ['Leave Travel Allowance',      allowanceLTA,       '—', 0],
                        ] as [string, number, string, number][]).map(([e, ea, d, da], i) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff', borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '7px 12px', color: '#374151' }}>{e}</td>
                            <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: '600', color: '#059669' }}>
                              {ea > 0 ? fmt(ea) : '—'}
                            </td>
                            <td style={{ padding: '7px 12px', color: '#374151', borderLeft: '1px solid #e2e8f0' }}>{d}</td>
                            <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: '600', color: da > 0 ? '#e11d48' : '#9ca3af' }}>
                              {da > 0 ? fmt(da) : '—'}
                            </td>
                          </tr>
                        ))}
                        {/* Totals */}
                        <tr style={{ background: '#1e293b', color: '#fff', fontWeight: '800' }}>
                          <td style={{ padding: '9px 12px' }}>TOTAL GROSS EARNINGS</td>
                          <td style={{ padding: '9px 12px', textAlign: 'right' }}>₹ {fmt(grossEarnings)}</td>
                          <td style={{ padding: '9px 12px', borderLeft: '1px solid #334155' }}>TOTAL DEDUCTIONS</td>
                          <td style={{ padding: '9px 12px', textAlign: 'right' }}>₹ {fmt(totalDeductions + lopDeduction)}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* ── Net Pay Banner ── */}
                    <div style={{ background: 'linear-gradient(135deg,#059669,#047857)', borderRadius: '10px', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '8.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.85 }}>Net Take-Home Salary</div>
                        <div style={{ fontSize: '28px', fontWeight: '900', marginTop: '2px' }}>₹ {fmt(netPay)}</div>
                        <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '1px' }}>
                          Rupees {netPay.toLocaleString('en-IN')} Only
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '8.5px', opacity: 0.8 }}>Annual CTC</div>
                        <div style={{ fontSize: '18px', fontWeight: '800' }}>₹ {fmt(annualCTC)}</div>
                        <div style={{ fontSize: '8px', opacity: 0.75, marginTop: '1px' }}>Incl. Employer PF + ESI</div>
                      </div>
                    </div>

                    {/* ── CTC Breakdown ── */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 18px' }}>
                      <div style={{ fontSize: '8.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '10px' }}>Annual CTC Breakdown</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', textAlign: 'center' }}>
                        {([
                          ['Gross Annual Salary', grossEarnings * 12],
                          ['Employer PF (12%)',   employerPF * 12],
                          ['Employer ESI (3.25%)', employerESI * 12],
                          ['Total Annual CTC',    annualCTC],
                        ] as [string, number][]).map(([lbl, val]) => (
                          <div key={lbl} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 8px' }}>
                            <div style={{ fontSize: '13px', fontWeight: '900', color: '#1d4ed8' }}>₹{fmt(val)}</div>
                            <div style={{ fontSize: '7.5px', color: '#64748b', fontWeight: '600', marginTop: '3px' }}>{lbl}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Approval + Signature ── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <div style={{ width: '10px', height: '10px', background: '#059669', borderRadius: '50%' }} />
                          <span style={{ fontSize: '8.5px', fontWeight: '800', color: '#059669' }}>PAYROLL APPROVED &amp; VERIFIED</span>
                        </div>
                        <div style={{ fontSize: '8px', color: '#94a3b8' }}>
                          <p style={{ fontWeight: '700', color: '#475569' }}>HBEONLABS PVT. LTD. — Payroll Division</p>
                          <p>This is a system-generated payslip. No physical signature required.</p>
                          <p style={{ marginTop: '2px' }}>Queries: payroll@hbeonlabs.com</p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ width: '130px', borderBottom: '1px solid #1e293b', height: '36px', marginBottom: '4px' }} />
                        <div style={{ fontSize: '8px', color: '#64748b', fontWeight: '700' }}>Authorized Signatory</div>
                        <div style={{ fontSize: '7.5px', color: '#94a3b8' }}>HR Department</div>
                      </div>
                    </div>

                  </div>{/* /padding wrapper */}
                </div>{/* /payslip-a4 */}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 2 — TAX DECLARATIONS
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'tax' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800 max-w-4xl mx-auto space-y-6">
          <div className="border-b pb-3 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Scale size={20} className="text-blue-500" /> Tax Exemption Calculator — FY 2026-27
            </h3>
            <span className="text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-1 rounded font-bold border border-blue-100 dark:border-blue-900">
              Progressive Slabs
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {([
              ['Section 80C — Investments (Max ₹1.5L)', sec80C, setSec80C, 'PPF, LIC, ELSS, NSC, EPF, Home Loan Principal'],
              ['Section 80D — Mediclaim Premium (Max ₹25K)', sec80D, setSec80D, 'Health insurance for self, spouse & children'],
              ['Annual House Rent Paid (₹)', rentPaid, setRentPaid, '40% of rent deductible as HRA exemption'],
              ['Other Income Sources (₹)', otherIncome, setOtherIncome, 'Freelance, interest, capital gains, etc.'],
            ] as [string, number, (v:number)=>void, string][]).map(([lbl, val, set, hint]) => (
              <div key={lbl}>
                <label className={labelCls}>{lbl}</label>
                <input type="number" value={val} onChange={e => set(Number(e.target.value))} className={inputCls} />
                <span className="text-[9px] text-slate-400 block mt-1">{hint}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between border-t pt-4 dark:border-slate-800 gap-4">
            <button type="button" onClick={handleCalcTax}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm cursor-pointer shadow transition">
              Calculate Net Tax Liability
            </button>
            {taxReport && (
              <div className="text-right space-y-1">
                <p className="text-xs text-slate-500">Gross Annual: ₹{taxReport.grossAnnual.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Total Deductions: –₹{taxReport.totalDeductions.toLocaleString()}</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Taxable Income: ₹{taxReport.taxableIncome.toLocaleString()}</p>
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">₹{taxReport.taxLiability.toLocaleString()} / yr</p>
              </div>
            )}
          </div>

          {taxReport && (
            <div className="border-t pt-4 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Progressive Slab Distribution</h4>
              <table className="w-full text-xs rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Income Slab</th>
                    <th className="px-4 py-2.5 text-center">Rate</th>
                    <th className="px-4 py-2.5 text-right">Tax Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {([
                    ['Up to ₹2,50,000',              '0%',  0],
                    ['₹2,50,001 – ₹5,00,000',        '5%',  Math.max(0, Math.min(250000, taxReport.taxableIncome - 250000) * 0.05)],
                    ['₹5,00,001 – ₹10,00,000',       '10%', Math.max(0, Math.min(500000, taxReport.taxableIncome - 500000) * 0.10)],
                    ['Above ₹10,00,000',              '20%', Math.max(0, (taxReport.taxableIncome - 1000000) * 0.20)],
                  ] as [string, string, number][]).map(([slab, rate, tax]) => (
                    <tr key={slab} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 font-medium">{slab}</td>
                      <td className="px-4 py-2.5 text-center font-bold text-blue-500">{rate}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-800 dark:text-slate-200">₹{fmt(tax)}</td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50 dark:bg-blue-950/30 font-extrabold text-slate-800 dark:text-slate-100">
                    <td className="px-4 py-2.5" colSpan={2}>Total Annual Tax Liability</td>
                    <td className="px-4 py-2.5 text-right text-blue-600 dark:text-blue-400">₹{fmt(taxReport.taxLiability)}</td>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-500">
                    <td className="px-4 py-2.5" colSpan={2}>Monthly TDS (÷12)</td>
                    <td className="px-4 py-2.5 text-right text-slate-800 dark:text-slate-200">₹{fmt(taxReport.taxLiability / 12)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 3 — PERFORMANCE APPRAISALS
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'appraisals' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800 space-y-5">
            <h3 className="text-lg font-bold border-b pb-2 dark:border-slate-800 flex items-center gap-2">
              <BadgeCheck size={17} className="text-blue-500" /> Create Appraisal Evaluation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Select Employee</label>
                <select value={appName} onChange={e => setAppName(e.target.value)} className={inputCls}>
                  <option value="">Select employee…</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={`${emp.firstName} ${emp.lastName}`}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Designation / Role</label>
                <input type="text" value={appRole} onChange={e => setAppRole(e.target.value)} className={inputCls} placeholder="e.g. Senior Backend Architect" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border dark:border-slate-800">
              {([
                ['Technical Competency', techRating, setTechRating],
                ['Communication Skills', commRating, setCommRating],
                ['Leadership & Teamwork', leadRating, setLeadRating],
                ['On-Time Delivery',     deliveryRating, setDeliveryRating],
              ] as [string, number, (v:number)=>void][]).map(([lbl, val, set]) => (
                <div key={lbl} className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 block">{lbl}</label>
                  <input type="range" min="1" max="5" value={val} onChange={e => set(Number(e.target.value))} className="w-full" />
                  <div className="flex gap-0.5 items-center">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={12} className={s <= val ? 'text-amber-400 fill-amber-400' : 'text-slate-300'} />
                    ))}
                    <span className="text-xs font-bold text-blue-500 ml-1">{val}/5</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Evaluation Notes</label>
                <input type="text" value={appRemarks} onChange={e => setAppRemarks(e.target.value)} className={inputCls} placeholder="Strengths and focus areas" />
              </div>
              <div>
                <label className={labelCls}>Goals for Next Cycle</label>
                <input type="text" value={appGoals} onChange={e => setAppGoals(e.target.value)} className={inputCls} placeholder="Key milestones & deliverables" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={handleAddAppraisal}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow transition cursor-pointer flex items-center gap-2">
                <Plus size={14} /> Publish Rating
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b dark:border-slate-800">
              <h4 className="font-bold text-slate-800 dark:text-slate-200">Active Appraisal Cycles</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b dark:border-slate-800 text-xs font-bold text-slate-500 uppercase">
                  <tr>
                    {['Employee','Role','Tech','Comm','Lead','Delivery','Overall','Notes'].map(h => (
                      <th key={h} className="px-5 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {appraisals.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="px-5 py-3 font-bold text-sm">{a.employeeName}</td>
                      <td className="px-5 py-3 text-xs text-slate-500">{a.role}</td>
                      {[a.techRating, a.commRating, a.leadRating, a.deliveryRating].map((r, i) => (
                        <td key={i} className="px-5 py-3 text-xs font-bold">{r}/5</td>
                      ))}
                      <td className="px-5 py-3">
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={12} className={s <= a.overallRating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'} />
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500 max-w-[180px]">
                        <p className="truncate">{a.remarks}</p>
                        <p className="text-blue-500 font-bold text-[10px] mt-0.5">→ {a.goals}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 4 — ATS RECRUITMENT BOARD
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'recruitment' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-bold border-b pb-2 dark:border-slate-800 flex items-center gap-2">
              <Building2 size={16} className="text-blue-500" /> Add Candidate to Pipeline
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {([
                ['Candidate Full Name',  candName,  setCandName,  'e.g. Tony Stark'],
                ['Target Role / Profile', candRole, setCandRole,  'e.g. Lead AWS Cloud'],
                ['Experience Level',     candExp,   setCandExp,   'e.g. 7 Years'],
              ] as [string, string, (v:string)=>void, string][]).map(([lbl, val, set, ph]) => (
                <div key={lbl}>
                  <label className={labelCls}>{lbl}</label>
                  <input type="text" value={val} onChange={e => set(e.target.value)} className={inputCls} placeholder={ph} />
                </div>
              ))}
              <div>
                <label className={labelCls}>Interview Score (/10)</label>
                <input type="number" step="0.5" min="1" max="10" value={candScore}
                  onChange={e => setCandScore(Number(e.target.value))} className={inputCls} />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={addCandidate}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow transition cursor-pointer flex items-center gap-2">
                <Plus size={14} /> Add Applicant
              </button>
            </div>
          </div>

          {/* Kanban */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {(['Applied','Screened','Technical','HR','Offered'] as Candidate['stage'][]).map(stage => {
              const list = candidates.filter(c => c.stage === stage);
              const dotColor: Record<string, string> = {
                Applied: 'bg-slate-400', Screened: 'bg-blue-500',
                Technical: 'bg-amber-500', HR: 'bg-indigo-500', Offered: 'bg-emerald-500',
              };
              const bgColor: Record<string, string> = {
                Applied: 'bg-slate-50 dark:bg-slate-900/60',
                Screened: 'bg-blue-50/50 dark:bg-blue-950/20',
                Technical: 'bg-amber-50/50 dark:bg-amber-950/20',
                HR: 'bg-indigo-50/50 dark:bg-indigo-950/20',
                Offered: 'bg-emerald-50/50 dark:bg-emerald-950/20',
              };
              return (
                <div key={stage} className={`${bgColor[stage]} border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 min-h-[300px]`}>
                  <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <span className={`w-2 h-2 rounded-full ${dotColor[stage]}`} />
                      {stage}
                    </span>
                    <span className="text-xs font-bold bg-white dark:bg-slate-900 text-slate-500 px-1.5 py-0.5 rounded-full border dark:border-slate-700">{list.length}</span>
                  </div>
                  {list.map(c => (
                    <div key={c.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2 shadow-sm hover:border-blue-400 transition">
                      <div>
                        <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{c.name}</p>
                        <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{c.role}</p>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 font-bold border-t pt-2 dark:border-slate-800">
                        <span className="flex items-center gap-1"><CalendarDays size={9} /> {c.experience}</span>
                        <span>Score: <span className="text-blue-500">{c.interviewerScore}/10</span></span>
                      </div>
                      <div className="flex items-center gap-1.5 border-t pt-2 dark:border-slate-800">
                        <select value={c.stage} onChange={e => moveStage(c.id, e.target.value as Candidate['stage'])}
                          className="flex-1 text-[9px] px-1.5 py-1 border dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer font-bold">
                          {['Applied','Screened','Technical','HR','Offered'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {c.stage === 'Offered' && (
                          <button type="button"
                            onClick={() => alert(`Offer letter dispatched to ${c.name} for "${c.role}" via SMTP.`)}
                            className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition cursor-pointer"
                            title="Send Offer Letter">
                            <Mail size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
