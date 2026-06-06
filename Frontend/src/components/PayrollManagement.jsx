import { memo, useEffect, useMemo, useState, useCallback } from "react";
import toast from "react-hot-toast";
import api from "../config/axios";
import { useAuth } from "../context/authContext";
import { SkeletonTable } from "./Skeleton";
import { formatDate } from "../utils/format";

const PayrollRow = memo(({ r, idx, canManage, onDelete }) => (
  <tr className="border-t border-slate-700 hover:bg-slate-700/30">
    <td className="px-4 py-3">{idx + 1}</td>
    <td className="px-4 py-3">{r.employee_id}</td>
    <td className="px-4 py-3 whitespace-nowrap">{r.user_name}</td>
    <td className="px-4 py-3">{r.department}</td>
    <td className="px-4 py-3">{r.basic_pay}</td>
    <td className="px-4 py-3">{r.allowances}</td>
    <td className="px-4 py-3">{r.deductions}</td>
    <td className="px-4 py-3 font-semibold text-cyan-400">{r.net_pay}</td>
    <td className="px-4 py-3 text-xs">
      {formatDate(r.pay_period_start)} to {formatDate(r.pay_period_end)}
    </td>
    <td className="px-4 py-3">
      <span className={`px-2 py-1 rounded-full text-xs ${
        r.status === "processed" ? "bg-cyan-500/20 text-cyan-400" : "bg-amber-500/20 text-amber-400"
      }`}>
        {r.status}
      </span>
    </td>
    {canManage && (
      <td className="px-4 py-3">
        <button onClick={() => onDelete(r.id)} className="text-rose-400 hover:text-white text-xs">
          Delete
        </button>
      </td>
    )}
  </tr>
));

const ProcessPayrollForm = memo(({ employees, onProcess, onCancel }) => {
  const [userId, setUserId] = useState("");
  const [basicPay, setBasicPay] = useState("");
  const [allowances, setAllowances] = useState("");
  const [deductions, setDeductions] = useState("");
  const [payPeriodStart, setPayPeriodStart] = useState("");
  const [payPeriodEnd, setPayPeriodEnd] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!userId || !payPeriodStart || !payPeriodEnd) {
      toast.error("Employee and pay period are required");
      return;
    }
    setSubmitting(true);
    try {
      await onProcess({ userId, basicPay, allowances, deductions, payPeriodStart, payPeriodEnd, paymentDate });
      setUserId("");
      setBasicPay("");
      setAllowances("");
      setDeductions("");
      setPayPeriodStart("");
      setPayPeriodEnd("");
      setPaymentDate("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4 space-y-3">
      <h3 className="font-semibold text-white">Process Payroll</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Employee</label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm w-full"
          >
            <option value="">Select employee</option>
            {employees.map((emp) => (
              <option key={emp._id || emp.id} value={emp._id || emp.id}>
                {emp.name} ({emp.employee_id || emp.employeeId})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Basic Pay</label>
          <input
            type="number" placeholder="Basic pay" value={basicPay}
            onChange={(e) => setBasicPay(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm w-full"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Allowances</label>
          <input
            type="number" placeholder="Allowances" value={allowances}
            onChange={(e) => setAllowances(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm w-full"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Deductions</label>
          <input
            type="number" placeholder="Deductions" value={deductions}
            onChange={(e) => setDeductions(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm w-full"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Pay Period Start</label>
          <input
            type="date" value={payPeriodStart}
            onChange={(e) => setPayPeriodStart(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm w-full"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Pay Period End</label>
          <input
            type="date" value={payPeriodEnd}
            onChange={(e) => setPayPeriodEnd(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm w-full"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Payment Date (optional)</label>
          <input
            type="date" value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm w-full"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm hover:bg-slate-600">
          Cancel
        </button>
        <button 
          onClick={handleSubmit} 
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm hover:bg-cyan-500 disabled:opacity-50"
        >
          {submitting ? "Processing..." : "Process"}
        </button>
      </div>
    </div>
  );
});

const useDebounce = (value, delay = 250) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
};

const PayrollManagement = () => {
  const { user } = useAuth();
  const canManage = ["root", "admin", "manager"].includes(user?.role);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [employees, setEmployees] = useState([]);

  const debouncedSearch = useDebounce(search);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = canManage ? {} : { userId: user?._id };
      const res = await api.get("/payroll", { params });
      setRows(res.data.payroll || []);
    } catch (err) {
      console.error("Failed to load payroll records:", err);
      toast.error("Failed to load payroll records");
    } finally {
      setLoading(false);
    }
  }, [canManage, user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!showForm) { setEmployees([]); return; }
    let cancelled = false;
    const fetchEmployees = async () => {
      try {
        const res = await api.get("/employees", { params: { limit: 200 } });
        if (!cancelled) setEmployees(res.data.users || []);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load employees:", err);
          toast.error("Failed to load employees");
        }
      }
    };
    fetchEmployees();
    return () => { cancelled = true; };
  }, [showForm]);

  const filtered = useMemo(() => {
    if (!debouncedSearch) return rows;
    const q = debouncedSearch.toLowerCase();
    return rows.filter(
      (r) =>
        (r.employee_id || "").toLowerCase().includes(q) ||
        (r.user_name || "").toLowerCase().includes(q) ||
        (r.department || "").toLowerCase().includes(q)
    );
  }, [rows, debouncedSearch]);

  const handleProcess = useCallback(async (formData) => {
    try {
      await api.post("/payroll", formData);
      toast.success("Payroll processed");
      setShowForm(false);
      load();
    } catch (err) {
      console.error("Failed to process payroll:", err);
      toast.error(err.response?.data?.error || "Failed to process payroll");
      throw err;
    }
  }, [load]);

  const handleDelete = useCallback(async (id) => {
    if (!confirm("Delete this payroll record?")) return;
    try {
      await api.delete(`/payroll/${id}`);
      toast.success("Payroll record deleted");
      load();
    } catch (err) {
      console.error("Failed to delete payroll:", err);
      toast.error(err.response?.data?.error || "Failed to delete");
    }
  }, [load]);

  const colSpan = canManage ? 11 : 10;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white">Payroll Management</h2>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label htmlFor="payroll-search" className="sr-only">Search payroll</label>
        <input
          id="payroll-search"
          type="search"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-2 text-sm text-white w-full sm:w-64"
        />
        {canManage && (
          <button onClick={() => setShowForm((p) => !p)} className="rounded-lg px-3 py-2 text-sm font-semibold bg-cyan-600 text-white hover:bg-cyan-500">
            {showForm ? "Cancel" : "+ Process Payroll"}
          </button>
        )}
      </div>

      {showForm && canManage && (
        <ProcessPayrollForm employees={employees} onProcess={handleProcess} onCancel={() => setShowForm(false)} />
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/60">
        <table className="min-w-full text-sm text-slate-200">
          <thead className="bg-slate-800 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Employee ID</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Dept</th>
              <th className="px-4 py-3 text-left">Basic</th>
              <th className="px-4 py-3 text-left">Allowances</th>
              <th className="px-4 py-3 text-left">Deductions</th>
              <th className="px-4 py-3 text-left">Net Pay</th>
              <th className="px-4 py-3 text-left">Period</th>
              <th className="px-4 py-3 text-left">Status</th>
              {canManage && <th className="px-4 py-3 text-left">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-12 text-center">
                  <SkeletonTable rows={5} cols={colSpan} />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-slate-400">No payroll records found</td>
              </tr>
            ) : (
              filtered.map((r, idx) => (
                <PayrollRow key={r.id} r={r} idx={idx} canManage={canManage} onDelete={handleDelete} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default memo(PayrollManagement);
