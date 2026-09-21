 "use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users, WalletCards, CalendarDays, Receipt, LayoutDashboard,
  UserRound, Plus, Trash2, Pencil, CheckCircle2, FileText, History
} from "lucide-react";
import { salaryForMonth, SalaryHistoryItem, getMonthEmploymentPeriod, earnedSalaryForPeriod, monthEnd } from "@/lib/salary";

type Staff = {
  id: number; name: string; phone: string | null; role: string | null;
  salary: number; joiningDate: string | null; active: boolean;
};
type Leave = { id: number; staffId: number; date: string; rejoinDate: string | null; days: number; reason: string | null; staff: Staff };
type Expense = { id: number; staffId: number; title: string; amount: number; date: string; category: string | null; notes: string | null; staff: Staff };
type Payment = { id: number; staffId: number; month: string; baseSalary: number; leaveDays: number; deduction: number; paidAmount: number; paidAt: string; notes: string | null; staff: Staff };

const money = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);
const monthNow = () => new Date().toISOString().slice(0, 7);
const startOfMonth = (value: string) => `${value}-01`;


export default function Dashboard({ initialData }: { initialData: { staff: Staff[]; leaves: Leave[]; expenses: Expense[]; payments: Payment[]; salaryHistory: SalaryHistoryItem[] } }) {
  const router = useRouter();
  const [staff, setStaff] = useState(initialData.staff);
  const [leaves, setLeaves] = useState(initialData.leaves);
  const [expenses, setExpenses] = useState(initialData.expenses);
  const [payments, setPayments] = useState(initialData.payments);
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistoryItem[]>(initialData.salaryHistory || []);
  const [tab, setTab] = useState("dashboard");
  const [month, setMonth] = useState(monthNow());
  const [editing, setEditing] = useState<Staff | null>(null);
  const [staffForm, setStaffForm] = useState({ name: "", phone: "", role: "", salary: "", joiningDate: today() });
  const [leaveForm, setLeaveForm] = useState({ staffId: "", date: today(), rejoinDate: "", reason: "" });
  const [expenseForm, setExpenseForm] = useState({ staffId: "", title: "", amount: "", date: today(), notes: "" });
  const [bulkExpenseMode, setBulkExpenseMode] = useState(false);
  const [bulkExpenseForm, setBulkExpenseForm] = useState({ staffId: "", date: today() });
  const [bulkExpenseRows, setBulkExpenseRows] = useState([{ title: "", amount: "", notes: "" }]);
  const [salaryStaff, setSalaryStaff] = useState("");
  const [salaryHistoryForm, setSalaryHistoryForm] = useState({ staffId: "", month: monthNow(), salary: "", notes: "" });
  const [notice, setNotice] = useState("");
  const [leaveFrom, setLeaveFrom] = useState(startOfMonth(monthNow()));
  const [leaveTo, setLeaveTo] = useState(monthEnd(monthNow()));
  const [expenseFrom, setExpenseFrom] = useState(startOfMonth(monthNow()));
  const [expenseTo, setExpenseTo] = useState(monthEnd(monthNow()));

  const monthLeaves = useMemo(() => leaves.filter(l => l.date.slice(0,7) === month), [leaves, month]);
  const monthExpenses = useMemo(() => expenses.filter(e => e.date.slice(0,7) === month), [expenses, month]);
  const filteredLeaves = useMemo(() => leaves.filter(l => l.date.slice(0,10) >= leaveFrom && l.date.slice(0,10) <= leaveTo), [leaves, leaveFrom, leaveTo]);
  const filteredExpenses = useMemo(() => expenses.filter(e => e.date.slice(0,10) >= expenseFrom && e.date.slice(0,10) <= expenseTo), [expenses, expenseFrom, expenseTo]);
  const filteredLeaveTotal = filteredLeaves.reduce((a, l) => a + l.days, 0);
  const filteredExpenseTotal = filteredExpenses.reduce((a, e) => a + e.amount, 0);
  const monthPayments = useMemo(() => payments.filter(p => p.month === month), [payments, month]);
  const totalSalary = staff.filter(s => s.active).reduce((a, s) => {
    const period = getMonthEmploymentPeriod(month, startOfMonth(month), monthEnd(month), s.joiningDate);
    return a + (period ? earnedSalaryForPeriod(salaryForMonth(salaryHistory, s.id, month, s.salary), period) : 0);
  }, 0);
  const totalExpenses = monthExpenses.reduce((a, e) => a + e.amount, 0);
  const totalLeave = monthLeaves.reduce((a, l) => a + l.days, 0);




  async function api(url: string, method: string, body: any) {
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error((await r.json()).error || "Request failed");
    return r.json();
  }

  function flash(msg: string) { setNotice(msg); setTimeout(() => setNotice(""), 2500); }

  async function saveStaff(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      ...staffForm, salary: Number(staffForm.salary), active: editing?.active ?? true,
      ...(editing ? { id: editing.id } : {})
    };
    const saved = await api("/api/staff", editing ? "PUT" : "POST", data);
    if (editing) setStaff(staff.map(s => s.id === saved.id ? saved : s));
    else setStaff([saved, ...staff]);
    if (Array.isArray(saved.salaryHistory)) {
      setSalaryHistory(prev => [...saved.salaryHistory, ...prev.filter(h => !saved.salaryHistory.some((x: SalaryHistoryItem) => x.id === h.id))]);
    }
    setEditing(null);
    setStaffForm({ name:"", phone:"", role:"", salary:"", joiningDate:today() });
    flash(editing ? "Staff updated" : "Staff added");
  }

  async function removeStaff(id: number) {
    if (!confirm("Delete this staff member? Their leaves and salary records will also be deleted.")) return;
    await api("/api/staff", "DELETE", { id });
    setStaff(staff.filter(s => s.id !== id));
    setLeaves(leaves.filter(l => l.staffId !== id));
    setPayments(payments.filter(p => p.staffId !== id));
    flash("Staff deleted");
  }

  function previewLeaveDays() {
    if (!leaveForm.date || !leaveForm.rejoinDate) return 0;
    const start = new Date(`${leaveForm.date}T00:00:00Z`);
    const end = new Date(`${leaveForm.rejoinDate}T00:00:00Z`);
    const days = Math.round((end.getTime() - start.getTime()) / 86400000);
    return days > 0 ? days : 0;
  }

  async function addLeave(e: React.FormEvent) {
    e.preventDefault();
    if (!leaveForm.staffId || !leaveForm.rejoinDate) return;
    const days = previewLeaveDays();
    if (days < 1) {
      flash("Rejoin date must be after leave date");
      return;
    }
    const saved = await api("/api/leaves", "POST", {
      staffId: Number(leaveForm.staffId),
      date: leaveForm.date,
      rejoinDate: leaveForm.rejoinDate,
      reason: leaveForm.reason
    });
    setLeaves([saved, ...leaves]);
    setLeaveForm({ staffId:"", date:today(), rejoinDate:"", reason:"" });
    flash(`Leave added — ${days} day(s)`);
  }

  async function removeLeave(id: number) {
    await api("/api/leaves", "DELETE", { id });
    setLeaves(leaves.filter(l => l.id !== id));
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    const saved = await api("/api/expenses", "POST", { ...expenseForm, staffId:Number(expenseForm.staffId), amount:Number(expenseForm.amount) });
    setExpenses([saved, ...expenses]);
    setExpenseForm({ staffId:"", title:"", amount:"", date:today(), notes:"" });
    flash("Expense added");
  }

  function updateBulkExpenseRow(index: number, field: "title" | "amount" | "notes", value: string) {
    setBulkExpenseRows(rows => rows.map((row, i) => i === index ? { ...row, [field]: value } : row));
  }

  function addBulkExpenseRow() {
    setBulkExpenseRows(rows => [...rows, { title: "", amount: "", notes: "" }]);
  }

  function removeBulkExpenseRow(index: number) {
    setBulkExpenseRows(rows => rows.length === 1 ? rows : rows.filter((_, i) => i !== index));
  }

  async function addBulkExpenses(e: React.FormEvent) {
    e.preventDefault();
    if (!bulkExpenseForm.staffId) { flash("Select a staff member"); return; }
    const validRows = bulkExpenseRows.filter(row => row.title.trim() || row.amount.trim() || row.notes.trim());
    if (!validRows.length) { flash("Add at least one expense"); return; }
    if (validRows.some(row => !row.title.trim() || !row.amount.trim() || !Number.isFinite(Number(row.amount)) || Number(row.amount) < 0)) {
      flash("Every expense row needs a title and valid amount");
      return;
    }
    const saved = await api("/api/expenses", "POST", {
      items: validRows.map(row => ({
        staffId: Number(bulkExpenseForm.staffId),
        date: bulkExpenseForm.date,
        title: row.title.trim(),
        amount: Number(row.amount),
        notes: row.notes.trim(),
      }))
    });
    setExpenses([...saved, ...expenses]);
    setBulkExpenseRows([{ title: "", amount: "", notes: "" }]);
    flash(`${saved.length} expense(s) added`);
  }

  async function removeExpense(id: number) {
    if (!confirm("Delete this expense?")) return;
    await api("/api/expenses", "DELETE", { id });
    setExpenses(expenses.filter(e => e.id !== id));
    flash("Expense deleted");
  }

  async function removeSalaryPayment(payment: Payment) {
    if (!confirm(`Delete the ${money(payment.paidAmount)} salary payment for ${payment.staff.name} (${payment.month})? This will make the salary pending again.`)) return;
    await api("/api/payments", "DELETE", { id: payment.id });
    setPayments(payments.filter(p => p.id !== payment.id));
    flash("Salary payment deleted");
  }

  async function saveSalaryHistory(e: React.FormEvent) {
    e.preventDefault();
    if (!salaryHistoryForm.staffId || !salaryHistoryForm.month) return;
    const salary = Number(salaryHistoryForm.salary);
    if (!Number.isFinite(salary) || salary < 0) { flash("Enter a valid salary"); return; }
    const historyStaff = staff.find(s => s.id === Number(salaryHistoryForm.staffId));
    if (historyStaff?.joiningDate && salaryHistoryForm.month < historyStaff.joiningDate.slice(0, 7)) {
      flash(`Salary history cannot be before joining month (${historyStaff.joiningDate.slice(0, 7)})`);
      return;
    }
    const saved = await api("/api/salary-history", "POST", {
      staffId: Number(salaryHistoryForm.staffId),
      month: salaryHistoryForm.month,
      salary,
      notes: salaryHistoryForm.notes
    });
    setSalaryHistory(prev => [saved, ...prev.filter(h => !(h.staffId === saved.staffId && h.month === saved.month))]);
    setSalaryHistoryForm({ staffId: salaryHistoryForm.staffId, month: monthNow(), salary: "", notes: "" });
    flash("Salary history saved");
  }

  async function removeSalaryHistory(id: number) {
    if (!confirm("Delete this salary history record? The report will fall back to the previous salary or current staff salary.")) return;
    await api("/api/salary-history", "DELETE", { id });
    setSalaryHistory(prev => prev.filter(h => h.id !== id));
    flash("Salary history deleted");
  }

  async function markSalaryPaid(s: Staff) {
    const period = getMonthEmploymentPeriod(month, startOfMonth(month), monthEnd(month), s.joiningDate);
    if (!period) {
      flash(`${s.name}: not employed in ${month}`);
      return;
    }
    const baseSalary = salaryForMonth(salaryHistory, s.id, month, s.salary);
    const earnedSalary = earnedSalaryForPeriod(baseSalary, period);
    const joining = s.joiningDate?.slice(0,10);
    const leaveDays = monthLeaves.filter(l => l.staffId === s.id && (!joining || l.date.slice(0,10) >= joining)).reduce((a,l)=>a+l.days,0);
    const leaveDeduction = Math.min(earnedSalary, baseSalary / 30 * leaveDays);
    const staffExpense = monthExpenses.filter(e => e.staffId === s.id).reduce((a,e)=>a+e.amount,0);
    const deduction = leaveDeduction + staffExpense;
    const paidAmount = Math.max(0, earnedSalary - deduction);
    const saved = await api("/api/payments", "POST", {
      staffId:s.id, month, baseSalary, leaveDays, deduction, paidAmount
    });
    setPayments([saved, ...payments.filter(p => !(p.staffId === s.id && p.month === month))]);
    flash(`${s.name}: ${money(paidAmount)} marked paid`);
  }

  function editStaff(s: Staff) {
    setEditing(s);
    setStaffForm({ name:s.name, phone:s.phone || "", role:s.role || "", salary:String(s.salary), joiningDate:s.joiningDate ? s.joiningDate.slice(0,10) : today() });
    setTab("staff");
  }

  const nav = [
    ["dashboard", <LayoutDashboard size={18}/>, "Dashboard"],
    ["staff", <UserRound size={18}/>, "Staff"],
    ["leaves", <CalendarDays size={18}/>, "Leaves"],
    ["salary", <WalletCards size={18}/>, "Salary"],
    ["salary-history", <History size={18}/>, "Salary History"],
    ["expenses", <Receipt size={18}/>, "Expenses"],
    ["reports", <FileText size={18}/>, "Reports"]
  ];

  return (
    <div className="min-h-screen flex app-shell">
      <aside className="hidden md:flex w-64 glass-sidebar p-5 flex-col">
        <div className="text-xl font-extrabold mb-8 brand-mark">Staff<span className="text-brand">Manager</span></div>
        <div className="space-y-1">
          {nav.map(([key, icon, label]) => (
            <button key={key as string} onClick={()=>key === "reports" ? router.push("/reports") : setTab(key as string)} className={`nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold ${tab===key ? "nav-item-active" : "text-slate-600"}`}>
              {icon}{label}
            </button>
          ))}
        </div>
        <div className="mt-auto text-xs text-slate-400">No login • Private business app</div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="glass-header px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="font-bold text-lg md:text-xl">{nav.find(n=>n[0]===tab)?.[2]}</h1>
            <p className="text-xs text-slate-500">Staff salary, leaves & expenses</p>
          </div>
          <input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="input !w-auto text-sm" />
        </header>

        <div className="md:hidden glass-mobile-nav px-2 py-2 overflow-x-auto flex gap-2">
          {nav.map(([key, icon, label]) => <button key={key as string} onClick={()=>key === "reports" ? router.push("/reports") : setTab(key as string)} className={`mobile-nav-item px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap ${tab===key?"mobile-nav-item-active":"text-slate-600"}`}>{label}</button>)}
        </div>

        {notice && <div className="fixed right-5 top-20 z-50 notice-glass text-white px-4 py-3 rounded-xl shadow-lg text-sm">{notice}</div>}

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {tab === "dashboard" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Stat icon={<Users/>} label="Active Staff" value={staff.filter(s=>s.active).length.toString()} />
                <Stat icon={<WalletCards/>} label="Monthly Salaries" value={money(totalSalary)} />
                <Stat icon={<CalendarDays/>} label="Leave Days" value={String(totalLeave)} />
                <Stat icon={<Receipt/>} label="Expenses" value={money(totalExpenses)} />
              </div>
              <div className="grid lg:grid-cols-2 gap-5 mt-6">
                <div className="card p-5">
                  <div className="flex justify-between items-center mb-4"><h2 className="font-bold">Salary for {month}</h2><button className="btn btn-light text-sm" onClick={()=>setTab("salary")}>Manage</button></div>
                  <div className="space-y-3">
                    {staff.filter(s=>s.active).slice(0,8).map(s => {
                      const paid = monthPayments.find(p=>p.staffId===s.id);
                      const period = getMonthEmploymentPeriod(month, startOfMonth(month), monthEnd(month), s.joiningDate);
                      const rate = salaryForMonth(salaryHistory, s.id, month, s.salary);
                      const earned = period ? earnedSalaryForPeriod(rate, period) : 0;
                      const joining = s.joiningDate?.slice(0,10);
                      const ld = monthLeaves.filter(l=>l.staffId===s.id && (!joining || l.date.slice(0,10) >= joining)).reduce((a,l)=>a+l.days,0);
                      const leaveDeduction = Math.min(earned, rate/30*ld);
                      const expense = monthExpenses.filter(e=>e.staffId===s.id && (!joining || e.date.slice(0,10) >= joining)).reduce((a,e)=>a+e.amount,0);
                      const payable = Math.max(0, earned-leaveDeduction-expense);
                      return <div key={s.id} className="flex items-center justify-between border-b last:border-0 pb-3">
                        <div><div className="font-semibold">{s.name}</div><div className="text-xs text-slate-500">{period ? `${ld} leave day(s)` : "Not employed"}</div></div>
                        <div className="text-right"><div className="font-bold">{money(payable)}</div>{paid ? <span className="text-xs text-green-600">Paid</span> : period ? <span className="text-xs text-orange-600">Pending</span> : <span className="text-xs text-slate-400">—</span>}</div>
                      </div>
                    })}
                    {!staff.length && <p className="text-sm text-slate-500">Add your first staff member.</p>}
                  </div>
                </div>
                <div className="card p-5">
                  <div className="flex justify-between items-center mb-4"><h2 className="font-bold">Recent Expenses</h2><button className="btn btn-light text-sm" onClick={()=>setTab("expenses")}>View all</button></div>
                  {monthExpenses.slice(0,6).map(e=><div key={e.id} className="flex justify-between py-3 border-b last:border-0"><div><b>{e.staff.name} — {e.title}</b><div className="text-xs text-slate-500">{e.date.slice(0,10)} • Expense / Advance</div></div><b>{money(e.amount)}</b></div>)}
                  {!monthExpenses.length && <p className="text-sm text-slate-500">No expenses this month.</p>}
                </div>
              </div>
            </>
          )}

          {tab === "staff" && <section>
            <div className="grid lg:grid-cols-[380px_1fr] gap-5">
              <form onSubmit={saveStaff} className="card p-5 h-fit">
                <h2 className="font-bold mb-4">{editing ? "Edit Staff" : "Add Staff"}</h2>
                <div className="space-y-3">
                  <Field label="Name"><input required className="input" value={staffForm.name} onChange={e=>setStaffForm({...staffForm,name:e.target.value})}/></Field>
                  <Field label="Role"><input className="input" value={staffForm.role} onChange={e=>setStaffForm({...staffForm,role:e.target.value})} placeholder="e.g. Helper"/></Field>
                  <Field label="Phone"><input className="input" value={staffForm.phone} onChange={e=>setStaffForm({...staffForm,phone:e.target.value})}/></Field>
                  <Field label="Monthly Salary"><input required type="number" min="0" className="input" value={staffForm.salary} onChange={e=>setStaffForm({...staffForm,salary:e.target.value})}/></Field>
                  <Field label="Joining Date"><input type="date" className="input" value={staffForm.joiningDate} onChange={e=>setStaffForm({...staffForm,joiningDate:e.target.value})}/></Field>
                  <div className="flex gap-2"><button className="btn btn-primary flex-1">{editing?"Update":"Add Staff"}</button>{editing&&<button type="button" className="btn btn-light" onClick={()=>{setEditing(null);setStaffForm({name:"",phone:"",role:"",salary:"",joiningDate:today()})}}>Cancel</button>}</div>
                </div>
              </form>
              <div className="card">
                <div className="p-5 flex justify-between"><h2 className="font-bold">All Staff ({staff.length})</h2></div>
                <div className="table-wrap"><table className="w-full"><thead><tr><th>Name</th><th>Role</th><th>Salary</th><th>Status</th><th>Action</th></tr></thead><tbody>
                  {staff.map(s=><tr key={s.id}><td><b>{s.name}</b><div className="text-xs text-slate-500">{s.phone||""}</div></td><td>{s.role||"-"}</td><td>{money(s.salary)}</td><td><span className={`px-2 py-1 rounded-full text-xs ${s.active?"bg-green-100 text-green-700":"bg-slate-100 text-slate-500"}`}>{s.active?"Active":"Inactive"}</span></td><td><div className="flex gap-2"><button onClick={()=>editStaff(s)} className="p-2 rounded-lg bg-slate-100"><Pencil size={15}/></button><button onClick={()=>removeStaff(s.id)} className="p-2 rounded-lg bg-red-50 text-red-600"><Trash2 size={15}/></button></div></td></tr>)}
                </tbody></table></div>
              </div>
            </div>
          </section>}

          {tab === "leaves" && <section>
            <div className="grid lg:grid-cols-[380px_1fr] gap-5">
              <form onSubmit={addLeave} className="card p-5 h-fit">
                <h2 className="font-bold mb-1">Add Leave</h2>
                <p className="text-xs text-slate-500 mb-4">Enter the leave and rejoin dates. Leave days are calculated automatically.</p>
                <div className="space-y-3">
                  <Field label="Staff"><select required className="input" value={leaveForm.staffId} onChange={e=>setLeaveForm({...leaveForm,staffId:e.target.value})}><option value="">Select staff</option>{staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
                  <Field label="Leave Date"><input required type="date" className="input" value={leaveForm.date} onChange={e=>setLeaveForm({...leaveForm,date:e.target.value})}/></Field>
                  <Field label="Rejoin Date"><input required type="date" min={leaveForm.date} className="input" value={leaveForm.rejoinDate} onChange={e=>setLeaveForm({...leaveForm,rejoinDate:e.target.value})}/></Field>
                  <div className={`rounded-xl px-3 py-2 text-sm ${previewLeaveDays() > 0 ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-500"}`}>Leave days: <b>{previewLeaveDays() || "—"}</b> <span className="text-xs">(calculated automatically)</span></div>
                  <Field label="Reason"><input className="input" value={leaveForm.reason} onChange={e=>setLeaveForm({...leaveForm,reason:e.target.value})} placeholder="Optional"/></Field>
                  <button className="btn btn-primary w-full"><Plus size={16} className="inline mr-1"/> Add Leave</button>
                </div>
              </form>
              <div className="card overflow-hidden">
                <div className="p-5 border-b border-slate-200/70">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div><h2 className="font-bold">Leave Records</h2><p className="text-sm text-slate-500">{filteredLeaveTotal} total day(s) in selected range</p></div>
                    <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
                      <label><span className="label">From</span><input type="date" className="input" value={leaveFrom} onChange={e=>setLeaveFrom(e.target.value)}/></label>
                      <label><span className="label">To</span><input type="date" className="input" value={leaveTo} onChange={e=>setLeaveTo(e.target.value)}/></label>
                    </div>
                  </div>
                </div>
                <div className="table-wrap section-table-scroll"><table className="w-full min-w-[720px]"><thead><tr><th>Staff</th><th>Leave Date</th><th>Rejoin Date</th><th>Days</th><th>Reason</th><th></th></tr></thead><tbody>
                  {filteredLeaves.map(l=><tr key={l.id}><td>{l.staff.name}</td><td>{l.date.slice(0,10)}</td><td>{l.rejoinDate ? l.rejoinDate.slice(0,10) : "—"}</td><td>{l.days}</td><td className="max-w-[280px] whitespace-normal">{l.reason||"-"}</td><td><button title="Delete leave" onClick={()=>removeLeave(l.id)} className="p-2 rounded-lg text-red-600 hover:bg-red-50"><Trash2 size={15}/></button></td></tr>)}
                  {!filteredLeaves.length&&<tr><td colSpan={6} className="text-slate-500">No leaves in this date range.</td></tr>}
                </tbody></table></div>
              </div>
            </div>
          </section>}

          {tab === "salary" && <section className="card">
            <div className="p-5 border-b"><h2 className="font-bold">Salary — {month}</h2><p className="text-sm text-slate-500 mt-1">Final payable = salary − leave deduction − staff expenses.</p></div>
            <div className="table-wrap"><table className="w-full"><thead><tr><th>Staff</th><th>Salary</th><th>Leave</th><th>Leave Ded.</th><th>Staff Expense</th><th>Payable</th><th>Status</th><th></th></tr></thead><tbody>
              {staff.map(s=>{
                const period=getMonthEmploymentPeriod(month,startOfMonth(month),monthEnd(month),s.joiningDate);
                const baseSalary=salaryForMonth(salaryHistory,s.id,month,s.salary);
                const earnedSalary=period?earnedSalaryForPeriod(baseSalary,period):0;
                const joining=s.joiningDate?.slice(0,10);
                const ld=monthLeaves.filter(l=>l.staffId===s.id&&(!joining||l.date.slice(0,10)>=joining)).reduce((a,l)=>a+l.days,0);
                const leaveDeduction=Math.min(earnedSalary,baseSalary/30*ld);
                const staffExpense=monthExpenses.filter(e=>e.staffId===s.id&&(!joining||e.date.slice(0,10)>=joining)).reduce((a,e)=>a+e.amount,0);
                const payable=Math.max(0,earnedSalary-leaveDeduction-staffExpense);
                const paid=monthPayments.find(p=>p.staffId===s.id);
                return <tr key={s.id}><td><b>{s.name}</b><div className="text-xs text-slate-500">{s.role||""}</div></td><td>{period?money(earnedSalary):<span className="text-slate-400">Not employed</span>}{period&&period.start!==startOfMonth(month)&&<div className="text-xs text-slate-500">Rate: {money(baseSalary)}</div>}</td><td>{period?ld:"—"}</td><td>{period?money(leaveDeduction):"—"}</td><td>{period?money(staffExpense):"—"}</td><td><b>{period?money(payable):"—"}</b></td><td>{paid?<span className="text-green-600 flex items-center gap-1"><CheckCircle2 size={15}/> Paid</span>:period?<span className="text-orange-600">Pending</span>:<span className="text-slate-400">—</span>}</td><td>{paid?<button onClick={()=>removeSalaryPayment(paid)} className="btn btn-danger text-xs inline-flex items-center gap-1"><Trash2 size={14}/> Delete Paid</button>:<button disabled={!period} onClick={()=>markSalaryPaid(s)} className={`btn text-xs ${!period?"bg-slate-100 text-slate-400":"btn-primary"}`}>{period?"Mark Paid":"—"}</button>}</td></tr>
              })}
            </tbody></table></div>
          </section>}

          {tab === "salary-history" && <section>
            <div className="grid lg:grid-cols-[380px_1fr] gap-5">
              <form onSubmit={saveSalaryHistory} className="card p-5 h-fit">
                <h2 className="font-bold mb-1">Add / Update Salary History</h2>
                <p className="text-xs text-slate-500 mb-4">Add the starting salary in the joining month, then add a new record only when the salary changes. Months without a new record automatically carry forward the latest previous salary.</p>
                <div className="space-y-3">
                  <Field label="Staff"><select required className="input" value={salaryHistoryForm.staffId} onChange={e=>{const id=e.target.value; const current=staff.find(s=>String(s.id)===id); setSalaryHistoryForm({...salaryHistoryForm,staffId:id,salary:current?String(salaryForMonth(salaryHistory,current.id,salaryHistoryForm.month,current.salary)):salaryHistoryForm.salary})}}><option value="">Select staff</option>{staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
                  <Field label="Month"><input required type="month" min={staff.find(s=>String(s.id)===salaryHistoryForm.staffId)?.joiningDate?.slice(0,7)} className="input" value={salaryHistoryForm.month} onChange={e=>{const m=e.target.value; const current=staff.find(s=>String(s.id)===salaryHistoryForm.staffId); setSalaryHistoryForm({...salaryHistoryForm,month:m,salary:current?String(salaryForMonth(salaryHistory,current.id,m,current.salary)):salaryHistoryForm.salary})}}/></Field>
                  <Field label="Monthly Salary"><input required type="number" min="0" step=".01" className="input" value={salaryHistoryForm.salary} onChange={e=>setSalaryHistoryForm({...salaryHistoryForm,salary:e.target.value})}/></Field>
                  <Field label="Notes"><textarea className="input" rows={3} value={salaryHistoryForm.notes} onChange={e=>setSalaryHistoryForm({...salaryHistoryForm,notes:e.target.value})} placeholder="e.g. Salary increased from June"/></Field>
                  <button className="btn btn-primary w-full"><Plus size={16} className="inline mr-1"/> Save Salary History</button>
                </div>
              </form>
              <div className="card">
                <div className="p-5 border-b"><h2 className="font-bold">Salary History</h2><p className="text-sm text-slate-500 mt-1">Enter the starting salary from the joining month and add a new entry whenever the monthly salary changes. The report carries the latest salary forward automatically.</p></div>
                <div className="table-wrap"><table className="w-full"><thead><tr><th>Month</th><th>Staff</th><th>Salary</th><th>Notes</th><th></th></tr></thead><tbody>
                  {salaryHistory.map(h=>{const s=staff.find(x=>x.id===h.staffId); return <tr key={h.id}><td><b>{h.month}</b></td><td>{s?.name||"Deleted staff"}</td><td><b>{money(h.salary)}</b></td><td>{h.notes||"—"}</td><td><button onClick={()=>{setSalaryHistoryForm({staffId:String(h.staffId),month:h.month,salary:String(h.salary),notes:h.notes||""}); window.scrollTo({top:0,behavior:"smooth"})}} className="p-2 rounded-lg bg-slate-100 mr-1"><Pencil size={15}/></button><button onClick={()=>removeSalaryHistory(h.id)} className="p-2 text-red-600"><Trash2 size={15}/></button></td></tr>})}
                  {!salaryHistory.length&&<tr><td colSpan={5} className="text-slate-500">No salary history yet. Add the first record for each staff member.</td></tr>}
                </tbody></table></div>
              </div>
            </div>
          </section>}

          {tab === "expenses" && <section>
            <div className="grid lg:grid-cols-[430px_1fr] gap-5">
              <div className="space-y-4">
                <div className="card p-2 flex gap-2">
                  <button type="button" onClick={()=>setBulkExpenseMode(false)} className={`btn flex-1 text-sm ${!bulkExpenseMode?"btn-primary":"btn-light"}`}>Single Expense</button>
                  <button type="button" onClick={()=>setBulkExpenseMode(true)} className={`btn flex-1 text-sm ${bulkExpenseMode?"btn-primary":"btn-light"}`}>Bulk Add</button>
                </div>
                {!bulkExpenseMode ? <form onSubmit={addExpense} className="card p-5 h-fit">
                  <h2 className="font-bold mb-1">Add Staff Expense / Advance</h2>
                  <p className="text-xs text-slate-500 mb-4">Add one expense record at a time.</p>
                  <div className="space-y-3">
                    <Field label="Staff"><select required className="input" value={expenseForm.staffId} onChange={e=>setExpenseForm({...expenseForm,staffId:e.target.value})}><option value="">Select staff</option>{staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
                    <Field label="Expense / Advance"><input required className="input" value={expenseForm.title} onChange={e=>setExpenseForm({...expenseForm,title:e.target.value})} placeholder="Travel, food, advance, etc."/></Field>
                    <Field label="Amount"><input required type="number" min="0" step=".01" className="input" value={expenseForm.amount} onChange={e=>setExpenseForm({...expenseForm,amount:e.target.value})}/></Field>
                    <Field label="Date"><input required type="date" className="input" value={expenseForm.date} onChange={e=>setExpenseForm({...expenseForm,date:e.target.value})}/></Field>
                    <Field label="Notes"><textarea className="input" rows={3} value={expenseForm.notes} onChange={e=>setExpenseForm({...expenseForm,notes:e.target.value})} placeholder="Optional"/></Field>
                    <button className="btn btn-primary w-full"><Plus size={16} className="inline mr-1"/> Add Expense / Advance</button>
                  </div>
                </form> : <form onSubmit={addBulkExpenses} className="card p-5 h-fit">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div><h2 className="font-bold">Bulk Add Expenses</h2><p className="text-xs text-slate-500 mt-1">Choose staff and date once, then enter multiple separate expenses.</p></div>
                    <span className="text-xs font-semibold bg-blue-50 text-blue-700 rounded-full px-2.5 py-1">{bulkExpenseRows.length} row{bulkExpenseRows.length===1?"":"s"}</span>
                  </div>
                  <div className="space-y-3 mt-4">
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Staff"><select required className="input" value={bulkExpenseForm.staffId} onChange={e=>setBulkExpenseForm({...bulkExpenseForm,staffId:e.target.value})}><option value="">Select staff</option>{staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
                      <Field label="Date"><input required type="date" className="input" value={bulkExpenseForm.date} onChange={e=>setBulkExpenseForm({...bulkExpenseForm,date:e.target.value})}/></Field>
                    </div>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="grid grid-cols-[1fr_105px_36px] gap-2 bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500"><span>Expense / Advance</span><span>Amount</span><span></span></div>
                      <div className="divide-y divide-slate-100">
                        {bulkExpenseRows.map((row,index)=><div key={index} className="p-3">
                          <div className="grid grid-cols-[1fr_105px_36px] gap-2 items-start">
                            <input className="input" value={row.title} onChange={e=>updateBulkExpenseRow(index,"title",e.target.value)} placeholder="Food, travel, advance..."/>
                            <input className="input" type="number" min="0" step=".01" value={row.amount} onChange={e=>updateBulkExpenseRow(index,"amount",e.target.value)} placeholder="0"/>
                            <button type="button" onClick={()=>removeBulkExpenseRow(index)} disabled={bulkExpenseRows.length===1} className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-30" title="Remove row"><Trash2 size={16}/></button>
                          </div>
                          <input className="input mt-2 text-sm" value={row.notes} onChange={e=>updateBulkExpenseRow(index,"notes",e.target.value)} placeholder="Notes (optional)"/>
                        </div>)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <button type="button" onClick={addBulkExpenseRow} className="btn btn-light text-sm"><Plus size={15} className="inline mr-1"/> Add Another Expense</button>
                      <div className="text-right"><div className="text-xs text-slate-500">Batch total</div><b>{money(bulkExpenseRows.reduce((sum,row)=>sum+(Number(row.amount)||0),0))}</b></div>
                    </div>
                    <button className="btn btn-primary w-full"><Plus size={16} className="inline mr-1"/> Save All Expenses</button>
                  </div>
                </form>}
              </div>
              <div className="card overflow-hidden">
                <div className="p-5 border-b border-slate-200/70">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div><h2 className="font-bold">Expenses / Advances</h2><p className="text-sm text-slate-500">{money(filteredExpenseTotal)} total in selected range</p></div>
                    <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
                      <label><span className="label">From</span><input type="date" className="input" value={expenseFrom} onChange={e=>setExpenseFrom(e.target.value)}/></label>
                      <label><span className="label">To</span><input type="date" className="input" value={expenseTo} onChange={e=>setExpenseTo(e.target.value)}/></label>
                    </div>
                  </div>
                </div>
                <div className="table-wrap section-table-scroll"><table className="w-full min-w-[680px]"><thead><tr><th>Date</th><th>Staff</th><th>Expense / Advance</th><th>Amount</th><th></th></tr></thead><tbody>
                  {filteredExpenses.map(e=><tr key={e.id}><td>{e.date.slice(0,10)}</td><td><b>{e.staff.name}</b></td><td className="max-w-[320px] whitespace-normal"><b>{e.title}</b>{e.notes&&<div className="text-xs text-slate-500 mt-1">{e.notes}</div>}</td><td><b>{money(e.amount)}</b></td><td><button title="Delete expense" onClick={()=>removeExpense(e.id)} className="p-2 rounded-lg text-red-600 hover:bg-red-50"><Trash2 size={15}/></button></td></tr>)}
                  {!filteredExpenses.length&&<tr><td colSpan={5} className="text-slate-500">No expenses in this date range.</td></tr>}
                </tbody></table></div>
              </div>
            </div>
          </section>}
        </div>
      </main>
    </div>
  );
}


function Stat({icon,label,value}:{icon:React.ReactNode;label:string;value:string}) {
  return <div className="card stat-card p-4"><div className="w-9 h-9 rounded-xl stat-icon flex items-center justify-center mb-3">{icon}</div><div className="text-xs text-slate-500">{label}</div><div className="text-xl font-extrabold mt-1">{value}</div></div>
}
function Field({label,children}:{label:string;children:React.ReactNode}) {
  return <label className="block"><span className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</span>{children}</label>
}