import { useEffect, useMemo, useState, useCallback } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { useAuth } from "../context/authContext";
import { Skeleton, SkeletonTable } from "./Skeleton";
import API_BASE from "../config/api.js";
const statusOptions = ["All", "Pending", "Approved", "Rejected"];

const LeavesList = () => {
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "", from: "", to: "", description: "" });
  const { user } = useAuth();
  const canApprove = ["admin", "manager", "root"].includes(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = {};
      if (statusFilter !== "All") params.status = statusFilter;
      if (search) params.search = search;

      const res = await axios.get(`${API_BASE}/api/leaves`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      setRows(
        res.data.leaves?.map((l) => ({
          id: l._id,
          empId: l.user?.employeeId || "NA",
          name: l.user?.name || "Unknown",
          type: l.type,
          dept: l.user?.department || "-",
          days: l.from && l.to ? Math.max(1, Math.ceil((new Date(l.to) - new Date(l.from)) / 86400000) + 1) : 1,
          status: l.status,
        })) || []
      );
    } catch {
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

  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE}/api/leaves/${id}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Leave ${status.toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update");
    }
  };

  const submitLeave = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE}/api/leaves`,
        { type: form.type, from: form.from, to: form.to, description: form.description },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Leave request submitted");
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
              <input
                id="leave-type"
                name="type"
                type="text"
                placeholder="Leave Type"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm w-full"
              />
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
                <tr key={l.id} className="border-t border-slate-700 hover:bg-slate-700/30">
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
                        <button onClick={() => updateStatus(l.id, "Rejected")} className="text-rose-400 hover:text-white text-xs">
                          Reject
                        </button>
                      </div>
                    ) : (
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
                    )}
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

export default LeavesList;
