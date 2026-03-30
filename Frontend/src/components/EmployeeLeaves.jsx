import { useEffect, useMemo, useState, useCallback } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { useAuth } from "../context/authContext";
import { Skeleton, SkeletonTable } from "./Skeleton";
import API_BASE from "../config/api.js";
const statusOptions = ["All", "Pending", "Approved", "Rejected"];
const leaveTypeOptions = [
  { value: "Annual Leave", label: "Annual Leave" },
  { value: "Sick Leave", label: "Sick Leave" },
  { value: "Casual Leave", label: "Casual Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
];

const EmployeeLeaves = () => {
  const [statusFilter, setStatusFilter] = useState("All");
  const [rows, setRows] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "", from: "", to: "", description: "" });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/leaves`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const mine = (res.data.leaves || []).filter((l) => l.user?._id === user?._id);
      setRows(
        mine.map((l) => ({
          id: l._id,
          type: l.type,
          from: l.from,
          to: l.to,
          description: l.description,
          status: l.status,
        }))
      );
    } catch {
      toast.error("Failed to load leaves");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (statusFilter === "All") return rows;
    return rows.filter((l) => l.status === statusFilter);
  }, [rows, statusFilter]);

  const submitLeave = async () => {
    if (!form.type || !form.from || !form.to) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (form.from > form.to) {
      toast.error("From date cannot be after To date");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE}/api/leaves`,
        { type: form.type, from: form.from, to: form.to, description: form.description },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Leave request submitted!");
      setShowForm(false);
      setForm({ type: "", from: "", to: "", description: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit");
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white">My Leave Requests</h2>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {statusOptions.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                statusFilter === s ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-200 border border-slate-600"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg px-4 py-2 text-sm font-semibold bg-cyan-600 text-white hover:bg-cyan-500"
        >
          + Apply for Leave
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4 space-y-3">
          <h3 className="font-semibold text-white">New Leave Request</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="emp-leave-type" className="text-xs text-slate-400"> Leave Type</label>
              <select
                id="emp-leave-type"
                name="type"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm w-full"
              >
                <option value="">Select Leave Type</option>
                {leaveTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="emp-leave-from" className="text-xs text-slate-400">From</label>
              <input
                id="emp-leave-from"
                name="from"
                type="date"
                value={form.from}
                onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm w-full"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="emp-leave-to" className="text-xs text-slate-400">To</label>
              <input
                id="emp-leave-to"
                name="to"
                type="date"
                value={form.to}
                onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm w-full"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="emp-leave-reason" className="text-xs text-slate-400">Reason</label>
            <textarea
              id="emp-leave-reason"
              name="description"
              placeholder="Reason..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm"
              rows={2}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm hover:bg-slate-600">
              Cancel
            </button>
            <button onClick={submitLeave} className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm hover:bg-cyan-500">
              Submit
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/60">
        <table className="min-w-full text-sm text-slate-200">
          <thead className="bg-slate-800 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">From</th>
              <th className="px-4 py-3 text-left">To</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center">
                  <SkeletonTable rows={5} cols={5} />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No leave requests found</td>
              </tr>
            ) : (
              filtered.map((l) => (
                <tr key={l.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                  <td className="px-4 py-3">{l.type}</td>
                  <td className="px-4 py-3">{l.from ? new Date(l.from).toLocaleDateString() : "-"}</td>
                  <td className="px-4 py-3">{l.to ? new Date(l.to).toLocaleDateString() : "-"}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{l.description || "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        l.status === "Approved"
                          ? "bg-cyan-500/20 text-cyan-400"
                          : l.status === "Rejected"
                          ? "bg-rose-500/20 text-rose-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeeLeaves;
