"use client";

import { useEffect, useMemo } from "react";
import { buildStaffReport, Data } from "./reportMath";

const money=(n:number)=>`₹${Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2})}`;
const dateLabel=(value:string)=>value?new Date(`${value.slice(0,10)}T00:00:00`).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"—";
const periodLabel=(from:string,to:string)=>`${dateLabel(from)} – ${dateLabel(to)}`;

type SalaryRow = ReturnType<typeof buildStaffReport>[number]["salaryRows"][number];
type YearlySalaryRow = {
  year: number;
  salary: number;
  leaveDays: number;
  leaveDeduction: number;
};

const buildYearlySalaryHistory = (rows: SalaryRow[]): YearlySalaryRow[] => {
  const grouped = new Map<number, YearlySalaryRow>();

  for (const row of rows) {
    const year = Number(row.month.slice(0, 4));
    if (!Number.isFinite(year)) continue;

    const current = grouped.get(year) ?? {
      year,
      salary: 0,
      leaveDays: 0,
      leaveDeduction: 0,
    };

    current.salary += row.salary;
    current.leaveDays += row.leaveDays;
    current.leaveDeduction += row.leaveDeduction;
    grouped.set(year, current);
  }

  return Array.from(grouped.values()).sort((a, b) => a.year - b.year);
};

export default function PrintReport({from,to,staffId,data}:{from:string;to:string;staffId:string;data:Data}){
  const rows=useMemo(()=>buildStaffReport(data,from,to,staffId),[data,from,to,staffId]);
  const totals=rows.reduce((a,r)=>({salary:a.salary+r.salaryTotal,leaveDays:a.leaveDays+r.leaveDays,leaveDeduction:a.leaveDeduction+r.leaveDeduction,expense:a.expense+r.staffExpense,payable:a.payable+r.payable,paid:a.paid+r.paidAmount,remaining:a.remaining+r.remaining}),{salary:0,leaveDays:0,leaveDeduction:0,expense:0,payable:0,paid:0,remaining:0});

  useEffect(()=>{
    const timer=window.setTimeout(()=>window.print(),900);
    return()=>window.clearTimeout(timer);
  },[]);

  return <div className="a4-report">
    <div className="print-toolbar no-print"><button onClick={()=>window.print()}>Print / Save PDF</button><button onClick={()=>window.close()}>Close</button></div>
    <div className="report-document">
      <header className="document-header">
        <div><h1>STAFF SALARY REPORT</h1><p>Salary, Leave & Staff Expense Settlement</p></div>
        <div className="period"><b>REPORT PERIOD</b><strong>{periodLabel(from,to)}</strong><span>Generated {dateLabel(new Date().toISOString())}</span></div>
      </header>

      <div className="report-title-row"><div><b>{staffId==="all"?"ALL ACTIVE STAFF":"INDIVIDUAL STAFF REPORT"}</b><span> • {rows.length} staff</span></div><div>Salary starts from joining date; partial months use a 30-day prorating basis. Salary changes use Salary History.</div></div>

      <div className="report-summary-boxes">
        <div><span>SALARY FOR PERIOD</span><b>{money(totals.salary)}</b></div>
        <div><span>LEAVE DAYS</span><b>{totals.leaveDays}</b></div>
        <div><span>LEAVE DEDUCTION</span><b>{money(totals.leaveDeduction)}</b></div>
        <div><span>STAFF EXPENSES</span><b>{money(totals.expense)}</b></div>
        <div><span>REMAINING PAYABLE</span><b>{money(totals.remaining)}</b></div>
      </div>

      <table className="summary-table"><thead><tr><th>STAFF</th><th>SALARY</th><th>LEAVE</th><th>LEAVE DED.</th><th>EXPENSE</th><th>PAID</th><th>REMAINING</th><th>STATUS</th></tr></thead><tbody>{rows.map(r=><tr key={r.staff.id}><td><b>{r.staff.name}</b><small>{r.staff.role||"Staff"}</small></td><td>{money(r.salaryTotal)}</td><td>{r.leaveDays}</td><td>{money(r.leaveDeduction)}</td><td>{money(r.staffExpense)}</td><td>{money(r.paidAmount)}</td><td><b>{money(r.remaining)}</b></td><td>{r.status}</td></tr>)}</tbody><tfoot><tr><th>TOTAL</th><th>{money(totals.salary)}</th><th>{totals.leaveDays}</th><th>{money(totals.leaveDeduction)}</th><th>{money(totals.expense)}</th><th>{money(totals.paid)}</th><th>{money(totals.remaining)}</th><th>—</th></tr></tfoot></table>

      {rows.map(r=><section className="staff-section" key={r.staff.id}>
        <div className="staff-heading"><div><h2>{r.staff.name}</h2><p>{r.staff.role||"Staff"}{r.staff.phone?` • ${r.staff.phone}`:""}{r.staff.joiningDate?` • Joined ${dateLabel(r.staff.joiningDate)}`:""}</p></div><div><span>REMAINING PAYABLE</span><strong>{money(r.remaining)}</strong></div></div>
        <div className="detail-metrics"><div><span>SALARY FOR PERIOD</span><b>{money(r.salaryTotal)}</b></div><div><span>LEAVE DAYS</span><b>{r.leaveDays}</b></div><div><span>LEAVE DEDUCTION</span><b>{money(r.leaveDeduction)}</b></div><div><span>EXPENSES / ADVANCES</span><b>{money(r.staffExpense)}</b></div><div><span>STATUS</span><b>{r.status}</b></div></div>

        {r.usingCurrentSalaryFallback&&<div className="print-warning"><b>No salary history exists for this staff member.</b> The current Staff salary is being used as a legacy fallback. Add the joining-month salary in Salary History for accurate historical reporting.</div>}
        {r.missingSalaryHistoryMonths.length>0&&<div className="print-warning"><b>Missing salary history:</b> {r.missingSalaryHistoryMonths.join(", ")}. Add these months in Salary History. They are not counted using the current salary.</div>}
        <div className="yearly-history"><h3>YEARLY SALARY HISTORY USED</h3><table className="detail-table"><thead><tr><th>Year</th><th>Salary Earned</th><th>Leave Days</th><th>Leave Deduction</th></tr></thead><tbody>{buildYearlySalaryHistory(r.salaryRows).map(x=><tr key={x.year}><td><b>{x.year}</b></td><td>{money(x.salary)}</td><td>{x.leaveDays}</td><td>{money(x.leaveDeduction)}</td></tr>)}</tbody><tfoot><tr><th>TOTAL</th><th>{money(r.salaryTotal)}</th><th>{r.leaveDays}</th><th>{money(r.leaveDeduction)}</th></tr></tfoot></table></div>

        <div className="detail-grid">
          <div><h3>LEAVE DETAILS</h3><table className="detail-table"><thead><tr><th>Leave Date</th><th>Rejoin Date</th><th>Days</th><th>Reason</th></tr></thead><tbody>{r.leaves.map(l=><tr key={l.id}><td>{dateLabel(l.date)}</td><td>{dateLabel(l.rejoinDate||"")}</td><td>{l.days}</td><td>{l.reason||"—"}</td></tr>)}{!r.leaves.length&&<tr><td colSpan={4}>No leave recorded in this period.</td></tr>}</tbody></table></div>
          <div><h3>STAFF EXPENSES / ADVANCES</h3><table className="detail-table"><thead><tr><th>Date</th><th>Particular / Advance</th><th>Amount</th></tr></thead><tbody>{r.expenses.map(e=><tr key={e.id}><td>{dateLabel(e.date)}</td><td>{e.title}{e.notes?<small className="print-note">{e.notes}</small>:null}</td><td>{money(e.amount)}</td></tr>)}{!r.expenses.length&&<tr><td colSpan={3}>No staff expense recorded.</td></tr>}</tbody></table></div>
        </div>

        <div className="calculation"><h3>SALARY CALCULATION</h3><div><span>Salary for selected period</span><b>{money(r.salaryTotal)}</b></div><div><span>Less: Leave Deduction</span><b>− {money(r.leaveDeduction)}</b></div><div><span>Less: Staff Expenses / Advances</span><b>− {money(r.staffExpense)}</b></div><div><span>Gross Final Payable</span><b>{money(r.payable)}</b></div><div><span>Less: Paid Amount</span><b>− {money(r.paidAmount)}</b></div><div className="grand"><span>REMAINING PAYABLE</span><b>{money(r.remaining)}</b></div></div>
        {r.payments.length>0&&<div className="payment-box"><b>PAYMENT RECORD</b><span>{r.payments.map(p=>`${money(p.paidAmount)} for ${p.month} • paid ${dateLabel(p.paidAt)}`).join(" • ")}</span></div>}
      </section>)}

      <footer className="document-footer"><span>StaffManager • Dedicated A4 Salary Report</span><span>Report period: {periodLabel(from,to)}</span></footer>
    </div>
  </div>;
}
