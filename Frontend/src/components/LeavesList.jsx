import { memo, useEffect, useMemo, useState, useCallback } from "react";
import toast from "react-hot-toast";
import api from "../config/axios";
import { useAuth } from "../context/authContext";
import { Skeleton, SkeletonTable } from "./Skeleton";
const statusOptions = ["All", "Pending", "Approved", "Rejected"];

const LeavesList = () => {
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "", from: "", to: "", description: "" });
  const [rejectLeaveId, setRejectLeaveId] = useState(null);
  const [adminComment, setAdminComment] = useState("");
  const { user } = useAuth();
  const canApprove = ["admin", "manager", "root"].includes(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== "All") params.status = statusFilter;
      if (search) params.search = search;

      const res = await api.get("/leaves", { params });

      setRows(
        res.data.leaves?.map((l) => ({
          id: l._id,
          empId: l.user?.employeeId || "NA",
          name: l.user?.name || "Unknown",
          type: l.type,
          dept: l.user?.department || "-",
          days: l.from && l.to ? Math.max(1, Math.ceil((new Date(l.to) - new Date(l.from)) / 86400000) + 1) : 1,
          status: l.status,
          adminComment: l.adminComment,
        })) || []
      );
    } catch (err) {
      console.error("Failed to load leaves:", err);
      toast.error("Failed to load leaves");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    load();
  }, [load, statusFilter]);

  const filtered = useMemo(() => {
    return rows.filter(
      (l) =>
        l.empId.toLowerCase().includes(search.toLowerCase()) ||
        l.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [rows, search]);

  const updateStatus = async (id, status, comment) => {
    try {
      await api.put(`/leaves/${id}/status`, { status, adminComment: comment });
      toast.success(`Leave ${status.toLowerCase()}`);
      load();
    } catch (err) {
      console.error("Failed to update leave:", err);
      toast.error(err.response?.data?.error || "Failed to update");
    }
  };

  const submitLeave = async () => {
    if (!form.type || !form.from || !form.to) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      const payload = { type: form.type, from: form.from, to: form.to, description: form.description };
      await api.post("/leaves", payload);
      toast.success("Leave request submitted");
      setShowForm(false);
      setForm({ type: "", from: "", to: "", description: "" });
      load();
    } catch (err) {
      console.error("Leave submit failed — full error:", err);
      console.error("Leave submit failed — response data:", err.response?.data);
      console.error("Leave submit failed — response status:", err.response?.status);
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Unknown error";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white">Leave Requests</h2>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label htmlFor="leaves-search" className="sr-only">Search leaves</label>
        <input
          id="leaves-search"
          name="search"
          type="search"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-2 text-sm text-white w-full sm:w-64"
        />
        <div className="flex flex-wrap gap-2">
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
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg px-3 py-2 text-sm font-semibold bg-cyan-600 text-white hover:bg-cyan-500"
          >
            + Apply
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4 space-y-3">
          <h3 className="font-semibold text-white">New Leave Request</h3>
          <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
              <label htmlFor="leave-type" className="text-xs text-slate-400">Leave Type</label>
              <select
                id="leave-type"
                name="type"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm w-full"
              >
                <option value="">Select type</option>
                <option value="Annual Leave">Annual Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Casual Leave">Casual Leave</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="leave-from" className="text-xs text-slate-400">From</label>
              <input
                id="leave-from"
                name="from"
                type="date"
                value={form.from}
                onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm w-full"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="leave-to" className="text-xs text-slate-400">To</label>
              <input
                id="leave-to"
                name="to"
                type="date"
                value={form.to}
                onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm w-full"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="leave-description" className="text-xs text-slate-400">Description</label>
            <textarea
              id="leave-description"
              name="description"
              placeholder="Description..."
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
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Employee ID</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Dept</th>
              <th className="px-4 py-3 text-left">Days</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <SkeletonTable rows={5} cols={7} />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">No requests found</td>
              </tr>
            ) : (
              filtered.map((l, idx) => (
                <tr key={l.id ?? idx} className="border-t border-slate-700 hover:bg-slate-700/30">
                  <td className="px-4 py-3">{idx + 1}</td>
                  <td className="px-4 py-3">{l.empId}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{l.name}</td>
                  <td className="px-4 py-3">{l.type}</td>
                  <td className="px-4 py-3">{l.dept}</td>
                  <td className="px-4 py-3">{l.days}</td>
                  <td className="px-4 py-3">
                    {l.status === "Pending" && canApprove ? (
                      <div className="flex gap-2">
                        <button onClick={() => updateStatus(l.id, "Approved")} className="text-cyan-400 hover:text-white text-xs">
                          Approve
                        </button>
                        <button onClick={() => { setRejectLeaveId(l.id); setAdminComment(""); }} className="text-rose-400 hover:text-white text-xs">
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span
                          className={`px-2 py-1 rounded-full text-xs text-center font-medium ${
                            l.status === "Approved"
                              ? "bg-cyan-500/20 text-cyan-400"
                              : l.status === "Rejected"
                              ? "bg-rose-500/20 text-rose-400"
                              : "bg-amber-500/20 text-amber-400"
                          }`}
                        >
                          {l.status}
                        </span>
                        {l.status === "Rejected" && l.adminComment && (
                          <span className="text-[11px] text-slate-400 mt-1 max-w-[150px] truncate" title={l.adminComment}>
                            Reason: {l.adminComment}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rejectLeaveId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Reject Leave Request</h3>
            <p className="text-sm text-slate-400">Please provide a reason for rejecting this leave request. This will be visible to the employee.</p>
            <div className="space-y-1">
              <label htmlFor="modal-comment" className="sr-only">Rejection Reason</label>
              <textarea
                id="modal-comment"
                placeholder="Reason for rejection..."
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                rows={4}
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setRejectLeaveId(null);
                  setAdminComment("");
                }}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold transition animate-hover"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateStatus(rejectLeaveId, "Rejected", adminComment);
                  setRejectLeaveId(null);
                  setAdminComment("");
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition animate-hover"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(LeavesList);
