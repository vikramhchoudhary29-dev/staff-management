import { SalaryHistoryItem, monthsBetween, salaryForMonth, getMonthEmploymentPeriod, earnedSalaryForPeriod } from "@/lib/salary";

export type Staff = { id:number; name:string; phone:string|null; role:string|null; salary:number; joiningDate:string|null; active:boolean };
export type Leave = { id:number; staffId:number; date:string; rejoinDate:string|null; days:number; reason:string|null; staff:Staff };
export type Expense = { id:number; staffId:number; title:string; amount:number; date:string; category:string|null; notes:string|null; staff:Staff };
export type Payment = { id:number; staffId:number; month:string; baseSalary:number; leaveDays:number; deduction:number; paidAmount:number; paidAt:string; notes:string|null; staff:Staff };
export type Data = { staff:Staff[]; leaves:Leave[]; expenses:Expense[]; payments:Payment[]; salaryHistory:SalaryHistoryItem[] };

const utcDate=(value:string)=>new Date(`${value.slice(0,10)}T00:00:00Z`);
const iso=(d:Date)=>d.toISOString().slice(0,10);
const addDays=(value:string,n:number)=>{const d=utcDate(value); d.setUTCDate(d.getUTCDate()+n); return iso(d);};
const firstOfMonth=(month:string)=>`${month}-01`;
const nextMonth=(month:string)=>{const [y,m]=month.split("-").map(Number); return `${m===12?y+1:y}-${String(m===12?1:m+1).padStart(2,"0")}-01`;};
const daysInclusive=(start:string,end:string)=>{
  const a=utcDate(start).getTime();
  const b=utcDate(end).getTime();
  if(!Number.isFinite(a)||!Number.isFinite(b)||b<a) return 0;
  return Math.round((b-a)/86400000)+1;
};

export function daysOverlap(start:string,endExclusive:string,from:string,to:string){
  const overlapStart=start>from?start:from;
  const overlapEndExclusive=endExclusive<addDays(to,1)?endExclusive:addDays(to,1);
  const a=utcDate(overlapStart).getTime();
  const b=utcDate(overlapEndExclusive).getTime();
  if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a) return 0;
  return Math.round((b-a)/86400000);
}

export function leaveDaysByMonth(leaves:Leave[], from:string, to:string, joiningDate?:string|null){
  const months=monthsBetween(from,to);
  return months.map(month=>{
    const monthStart=firstOfMonth(month);
    const monthEnd=addDays(nextMonth(month),-1);
    const days=leaves.reduce((sum,l)=>{
      const leaveStart=l.date.slice(0,10);
      const leaveEndExclusive=l.rejoinDate?l.rejoinDate.slice(0,10):addDays(leaveStart,1);
      const effectiveFrom=[from,monthStart,joiningDate?.slice(0,10)||from].sort().at(-1)!;
      const effectiveTo=[to,monthEnd].sort()[0];
      if(leaveEndExclusive<=effectiveFrom || leaveStart>effectiveTo) return sum;
      return sum+daysOverlap(leaveStart,leaveEndExclusive,effectiveFrom,effectiveTo);
    },0);
    return {month,days};
  });
}


export function buildStaffReport(data:Data,from:string,to:string,staffId:string){
  const months=monthsBetween(from,to);
  const selected=data.staff.filter(s=>s.active&&(staffId==="all"||String(s.id)===staffId));
  return selected.map(staff=>{
    const joining=staff.joiningDate?.slice(0,10)||null;
    const leaves=data.leaves.filter(l=>l.staffId===staff.id&&l.date.slice(0,10)<=to&&(l.rejoinDate?l.rejoinDate.slice(0,10)>from:l.date.slice(0,10)>=from)&&(!joining||l.date.slice(0,10)>=joining));
    const expenses=data.expenses.filter(e=>e.staffId===staff.id&&e.date.slice(0,10)>=from&&e.date.slice(0,10)<=to&&(!joining||e.date.slice(0,10)>=joining));
    const staffHasHistory=data.salaryHistory.some(h=>h.staffId===staff.id);
    const leaveByMonth=leaveDaysByMonth(leaves,from,to,joining);
    const salaryRows=months.flatMap(month=>{
      const period=getMonthEmploymentPeriod(month,from,to,joining);
      if(!period) return [];
      const salaryRate=salaryForMonth(data.salaryHistory,staff.id,month,staff.salary);
      const applicableHistory=data.salaryHistory.some(h=>h.staffId===staff.id&&h.month.slice(0,7)<=month);
      const historyMissing=staffHasHistory&&!applicableHistory;
      const salary=earnedSalaryForPeriod(salaryRate,period);
      const monthLeave=leaveByMonth.find(x=>x.month===month)?.days||0;
      const leaveDeduction=Math.min(salary, salaryRate/30*monthLeave);
      const eligibleDays=period.start===period.monthStart&&period.end===period.monthEnd?30:Math.min(30,daysInclusive(period.start,period.end));
      return [{month,salaryRate,salary,eligibleDays,leaveDays:monthLeave,leaveDeduction,historyMissing}];
    });
    const missingSalaryHistoryMonths=salaryRows.filter(r=>r.historyMissing).map(r=>r.month);
    const usingCurrentSalaryFallback=!staffHasHistory;
    const salaryTotal=salaryRows.reduce((a,r)=>a+r.salary,0);
    const leaveDays=salaryRows.reduce((a,r)=>a+r.leaveDays,0);
    const leaveDeduction=salaryRows.reduce((a,r)=>a+r.leaveDeduction,0);
    const staffExpense=expenses.reduce((a,e)=>a+e.amount,0);
    const payable=Math.max(0,salaryTotal-leaveDeduction-staffExpense);
    const payableMonths=new Set(salaryRows.filter(r=>r.salary>0).map(r=>r.month));
    const payments=data.payments.filter(p=>p.staffId===staff.id&&payableMonths.has(p.month.slice(0,7)));
    const paidAmount=payments.reduce((a,p)=>a+p.paidAmount,0);
    const remaining=Math.max(0,payable-paidAmount);
    const status=salaryRows.length===0?"NOT IN PERIOD":remaining<=0&&payable>0?"PAID":paidAmount>0?"PARTIALLY PAID":"PENDING";
    return {staff,leaves,expenses,salaryRows,salaryTotal,leaveDays,leaveDeduction,staffExpense,payable,payments,paidAmount,remaining,status,joiningDate:joining,missingSalaryHistoryMonths,usingCurrentSalaryFallback};
  });
}
