"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, CalendarRange, FileText, Printer, Users, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { buildStaffReport, Data } from "./reportMath";

const money=(n:number)=>`₹${Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2})}`;
const today=()=>new Date().toISOString().slice(0,10);
const monthStart=(value:string)=>`${value.slice(0,7)}-01`;
const monthEnd=(value:string)=>{ const [y,m]=value.slice(0,7).split("-").map(Number); return `${y}-${String(m).padStart(2,"0")}-${new Date(y,m,0).getDate()}`; };
const dateLabel=(value:string)=>value?new Date(`${value.slice(0,10)}T00:00:00`).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"—";

export default function ReportsCenter({initialData}:{initialData:Data}) {
  const router=useRouter();
  const initial=monthStart(today());
  const [fromDate,setFromDate]=useState(initial);
  const [toDate,setToDate]=useState(monthEnd(initial));
  const [staffId,setStaffId]=useState("all");
  const validRange=!!fromDate&&!!toDate&&fromDate<=toDate;
  const rows=useMemo(()=>validRange?buildStaffReport(initialData,fromDate,toDate,staffId):[],[initialData,fromDate,toDate,staffId,validRange]);
  const totals=rows.reduce((a,r)=>({salary:a.salary+r.salaryTotal,leaveDays:a.leaveDays+r.leaveDays,deduction:a.deduction+r.leaveDeduction,expenses:a.expenses+r.staffExpense,payable:a.payable+r.payable,paid:a.paid+r.paidAmount,remaining:a.remaining+r.remaining}),{salary:0,leaveDays:0,deduction:0,expenses:0,payable:0,paid:0,remaining:0});
  const period=validRange?`${dateLabel(fromDate)} – ${dateLabel(toDate)}`:"Invalid date range";
  const query=`from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}&staff=${encodeURIComponent(staffId)}`;
  const openPrint=()=>{if(validRange)window.open(`/reports/print?${query}`,"_blank","noopener,noreferrer");};

  return <div className="reports-shell">
    <header className="reports-header sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0"><button onClick={()=>router.push("/")} className="p-2 rounded-xl hover:bg-slate-100 shrink-0" aria-label="Back"><ArrowLeft size={19}/></button><div><h1 className="text-xl font-extrabold">Reports</h1><p className="text-xs text-slate-500">Dedicated staff salary, leave & expense reports</p></div></div>
        <button disabled={!validRange} onClick={openPrint} className="btn btn-primary flex items-center gap-2"><Printer size={17}/> <span className="hidden sm:inline">Print / Save A4 PDF</span><span className="sm:hidden">Print</span></button>
      </div>
    </header>

    <main className="max-w-7xl mx-auto p-4 md:p-8">
      <section className="card reports-filter p-4 md:p-5 mb-5">
        <div className="flex items-center gap-2 font-bold mb-4"><CalendarRange size={18}/> Report Period</div>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block"><span className="label">From Date</span><input type="date" className="input" value={fromDate} onChange={e=>setFromDate(e.target.value)}/></label>
          <label className="block"><span className="label">To Date</span><input type="date" className="input" value={toDate} onChange={e=>setToDate(e.target.value)}/></label>
          <label className="block"><span className="label">Staff</span><select className="input" value={staffId} onChange={e=>setStaffId(e.target.value)}><option value="all">All active staff</option>{initialData.staff.filter(s=>s.active).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        </div>
        <p className={`text-xs mt-3 ${validRange?"text-slate-500":"text-red-600"}`}>{validRange?`Report period: ${period}. Salary starts from each staff member's joining date; partial joining/report months are prorated on a 30-day basis, and salary changes use Salary History.`:"Please select a valid date range."}</p>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
        <Metric icon={<WalletCards size={16}/>} label="Salary for Period" value={money(totals.salary)}/>
        <Metric icon={<CalendarRange size={16}/>} label="Leave Days" value={String(totals.leaveDays)}/>
        <Metric icon={<FileText size={16}/>} label="Total Deductions" value={money(totals.deduction+totals.expenses)}/>
        <Metric icon={<WalletCards size={16}/>} label="Remaining Payable" value={money(totals.remaining)} strong/>
      </div>

      <section className="card reports-summary-card overflow-hidden">
        <div className="p-5 flex items-center justify-between gap-3"><div><h2 className="font-bold text-lg">Staff Settlement Summary</h2><p className="text-sm text-slate-500">{period} • {staffId==="all"?"All active staff":rows[0]?.staff.name||"Selected staff"}</p></div><div className="text-sm text-slate-500 flex items-center gap-2"><Users size={16}/>{rows.length} staff</div></div>
        <div className="table-wrap"><table className="w-full"><thead><tr><th>Staff</th><th>Salary</th><th>Leave</th><th>Leave Ded.</th><th>Staff Expense</th><th>Paid</th><th>Remaining</th><th>Status</th></tr></thead><tbody>
          {rows.map(r=><tr key={r.staff.id}><td><b>{r.staff.name}</b><div className="text-xs text-slate-500">{r.staff.role||"Staff"}</div></td><td>{money(r.salaryTotal)}</td><td>{r.leaveDays}</td><td>{money(r.leaveDeduction)}</td><td>{money(r.staffExpense)}</td><td>{money(r.paidAmount)}</td><td><b>{money(r.remaining)}</b></td><td>{r.status}</td></tr>)}
          {!rows.length&&<tr><td colSpan={8} className="text-center text-slate-500 py-10">No active staff found for this selection.</td></tr>}
        </tbody><tfoot><tr className="bg-slate-50 font-bold"><th>Total</th><th>{money(totals.salary)}</th><th>{totals.leaveDays}</th><th>{money(totals.deduction)}</th><th>{money(totals.expenses)}</th><th>{money(totals.paid)}</th><th>{money(totals.remaining)}</th><th>—</th></tr></tfoot></table></div>
      </section>

      {rows.map(r=><section key={r.staff.id} className="card reports-summary-card mt-5 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4"><div><h2 className="text-lg font-extrabold">{r.staff.name}</h2><p className="text-xs text-slate-500">{r.staff.role||"Staff"}{r.staff.phone?` • ${r.staff.phone}`:""}</p></div><div className="text-left sm:text-right"><div className="text-xs text-slate-500">Remaining Payable</div><div className="text-xl font-extrabold">{money(r.remaining)}</div></div></div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 my-4"><Metric label="Salary" value={money(r.salaryTotal)}/><Metric label="Leave Days" value={String(r.leaveDays)}/><Metric label="Leave Deduction" value={money(r.leaveDeduction)}/><Metric label="Expenses" value={money(r.staffExpense)}/><Metric label="Status" value={r.status}/></div>
        <h3 className="font-bold mb-2">Monthly Salary Used</h3>
        {r.usingCurrentSalaryFallback&&<div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><b>No salary history exists for this staff member.</b> The report is using the current Staff salary as a legacy fallback. Add the joining-month salary in <b>Salary History</b> to make historical reports accurate.</div>}
        {r.missingSalaryHistoryMonths.length>0&&<div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><b>Missing salary history:</b> {r.missingSalaryHistoryMonths.join(", ")}. Add the old salary in <b>Salary History</b> for these months. These months are not counted using the current salary.</div>}
        <div className="table-wrap mb-5"><table className="w-full"><thead><tr><th>Month</th><th>Monthly Rate</th><th>Salary Earned</th><th>Leave Days</th><th>Leave Deduction</th></tr></thead><tbody>{r.salaryRows.map(x=><tr key={x.month}><td>{x.month}</td><td>{money(x.salaryRate)}</td><td>{money(x.salary)}</td><td>{x.leaveDays}</td><td>{money(x.leaveDeduction)}</td></tr>)}</tbody></table></div>
        <div className="grid lg:grid-cols-2 gap-5">
          <div><h3 className="font-bold mb-2">Leave Details</h3><div className="table-wrap"><table className="w-full"><thead><tr><th>Leave</th><th>Rejoin</th><th>Days</th><th>Reason</th></tr></thead><tbody>{r.leaves.map(l=><tr key={l.id}><td>{dateLabel(l.date)}</td><td>{dateLabel(l.rejoinDate||"")}</td><td>{l.days}</td><td>{l.reason||"—"}</td></tr>)}{!r.leaves.length&&<tr><td colSpan={4}>No leave recorded.</td></tr>}</tbody></table></div></div>
          <div><h3 className="font-bold mb-2">Staff Expenses / Advances</h3><div className="table-wrap"><table className="w-full"><thead><tr><th>Date</th><th>Particular / Advance</th><th>Amount</th></tr></thead><tbody>{r.expenses.map(e=><tr key={e.id}><td>{dateLabel(e.date)}</td><td>{e.title}</td><td>{money(e.amount)}</td></tr>)}{!r.expenses.length&&<tr><td colSpan={3}>No staff expense recorded.</td></tr>}</tbody></table></div></div>
        </div>
      </section>)}
    </main>
  </div>;
}

function Metric({icon,label,value,strong}:{icon?:React.ReactNode;label:string;value:string;strong?:boolean}){return <div className={`card p-3 md:p-4 ${strong?"report-metric-strong":""}`}><div className="flex items-center gap-2 text-xs text-slate-500">{icon}<span>{label}</span></div><div className={`mt-2 ${strong?"text-xl md:text-2xl":"text-lg md:text-xl"} font-extrabold break-words`}>{value}</div></div>}
