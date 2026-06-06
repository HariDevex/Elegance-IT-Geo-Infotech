import { memo, useEffect, useMemo, useState, useCallback } from "react";
import toast from "react-hot-toast";
import api from "../config/axios";
import { useAuth } from "../context/authContext";
import { SkeletonTable } from "./Skeleton";
import { formatDate } from "../utils/format";

const statusOptions = ["All", "Pending", "Approved", "Rejected"];

const ResignationWorkflow = () => {
  const { user } = useAuth();
  const canManage = ["root", "admin", "manager"].includes(user?.role);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ reason: "", lastWorkingDay: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== "All") params.status = statusFilter;
      const res = await api.get("/resignations", { params });
      setRows(res.data.resignations || []);
    } catch (err) {
      console.error("Failed to load resignations:", err);
      toast.error("Failed to load resignations");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        (r.employee_id || "").toLowerCase().includes(q) ||
        (r.user_name || "").toLowerCase().includes(q) ||
        (r.reason || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const handleSubmit = async () => {
    if (!form.reason || !form.lastWorkingDay) {
      toast.error("Reason and last working day are required");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/resignations", form);
      toast.success("Resignation submitted");
      setShowForm(false);
      setForm({ reason: "", lastWorkingDay: "" });
      load();
    } catch (err) {
      console.error("Failed to submit resignation:", err);
      toast.error(err.response?.data?.error || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const adminNotes = prompt(`Enter notes for ${status}:`);
      if (adminNotes === null) return; // User cancelled
      
      await api.put(`/resignations/${id}/status`, { status, adminNotes });
      toast.success(`Resignation ${status.toLowerCase()}`);
      load();
    } catch (err) {
      console.error("Failed to update resignation:", err);
      toast.error(err.response?.data?.error || "Failed to update");
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white">Resignation Workflow</h2>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label htmlFor="resignation-search" className="sr-only">Search resignations</label>
        <input
          id="resignation-search"
          type="search"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-2 text-sm text-white w-full sm:w-64"
        />
        <div className="flex flex-wrap gap-2">
          {canManage && statusOptions.map((s) => (
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
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg px-3 py-2 text-sm font-semibold bg-cyan-600 text-white hover:bg-cyan-500"
          >
            + Submit Resignation
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4 space-y-3">
          <h3 className="font-semibold text-white">Submit Resignation</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Reason</label>
              <textarea
                placeholder="Reason for resignation"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm"
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Last Working Day</label>
              <input
                type="date"
                value={form.lastWorkingDay}
                onChange={(e) => setForm((f) => ({ ...f, lastWorkingDay: e.target.value }))}
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm w-full"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm hover:bg-slate-600">
              Cancel
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm hover:bg-cyan-500 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/60">
        <table className="min-w-full text-sm text-slate-200">
          <thead className="bg-slate-800 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Employee ID</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Dept</th>
              <th className="px-4 py-3 text-left">Reason</th>
              <th className="px-4 py-3 text-left">Last Working Day</th>
              <th className="px-4 py-3 text-left">Status</th>
              {canManage && <th className="px-4 py-3 text-left">Approved By</th>}
              <th className="px-4 py-3 text-left">Admin Notes</th>
              {canManage && <th className="px-4 py-3 text-left">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={canManage ? 10 : 8} className="px-4 py-12 text-center">
                  <SkeletonTable rows={5} cols={canManage ? 10 : 8} />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 10 : 8} className="px-4 py-8 text-center text-slate-400">No resignations found</td>
              </tr>
            ) : (
              filtered.map((r, idx) => (
                <tr key={r.id ?? idx} className="border-t border-slate-700 hover:bg-slate-700/30">
                  <td className="px-4 py-3">{idx + 1}</td>
                  <td className="px-4 py-3">{r.employee_id}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.user_name}</td>
                  <td className="px-4 py-3">{r.department}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate">{r.reason}</td>
                  <td className="px-4 py-3">{formatDate(r.last_working_day)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      r.status === "Approved" ? "bg-cyan-500/20 text-cyan-400" :
                      r.status === "Rejected" ? "bg-rose-500/20 text-rose-400" :
                      "bg-amber-500/20 text-amber-400"
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  {canManage && <td className="px-4 py-3">{r.approved_by_name || "-"}</td>}
                  <td className="px-4 py-3 max-w-[150px] truncate text-xs text-slate-400">{r.admin_notes || "-"}</td>
                  {canManage && (
                    <td className="px-4 py-3">
                      {r.status === "Pending" ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleUpdateStatus(r.id, "Approved")} className="text-cyan-400 hover:text-white text-xs">
                            Approve
                          </button>
                          <button onClick={() => handleUpdateStatus(r.id, "Rejected")} className="text-rose-400 hover:text-white text-xs">
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">-</span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default memo(ResignationWorkflow);
