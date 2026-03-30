import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { Trash2, Plus, Lock, Calendar, RefreshCw } from "lucide-react";
import { useAuth } from "../context/authContext";
import { Skeleton, SkeletonTable } from "./Skeleton";
import API_BASE from "../config/api.js";

const HolidayManagement = () => {
  const { user } = useAuth();
  const canManage = ["root", "admin", "manager", "hr", "teamlead"].includes(user?.role);
  const canAutoPopulate = ["root", "admin", "manager"].includes(user?.role);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", date: "", type: "public", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [autoPopulating, setAutoPopulating] = useState(false);

  useEffect(() => {
    fetchHolidays();
  }, [selectedYear]);

  const fetchHolidays = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/holidays?year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setHolidays(res.data.holidays || []);
      }
    } catch {
      toast.error("Failed to fetch holidays");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoPopulate = async () => {
    setAutoPopulating(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE}/api/holidays/auto-populate?years=2`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast.success("Holidays auto-populated!");
        fetchHolidays();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to auto-populate holidays");
    } finally {
      setAutoPopulating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE}/api/holidays`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        toast.success("Holiday added!");
        setForm({ name: "", date: "", type: "public", description: "" });
        setShowForm(false);
        fetchHolidays();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to add holiday");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this holiday?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE}/api/holidays/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Holiday deleted");
      fetchHolidays();
    } catch {
      toast.error("Failed to delete holiday");
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case "public": return "bg-cyan-500/20 text-cyan-400 border-cyan-500/50";
      case "company": return "bg-blue-500/20 text-blue-400 border-blue-500/50";
      case "sunday": return "bg-purple-500/20 text-purple-400 border-purple-500/50";
      case "optional": return "bg-slate-500/20 text-slate-400 border-slate-500/50";
      default: return "bg-slate-500/20 text-slate-400 border-slate-500/50";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-semibold text-white">Holiday Management</h2>
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white text-sm"
          >
            {[...Array(5)].map((_, i) => {
              const year = new Date().getFullYear() - 2 + i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
          {canAutoPopulate && (
            <button
              onClick={handleAutoPopulate}
              disabled={autoPopulating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={autoPopulating ? "animate-spin" : ""} />
              {autoPopulating ? "Populating..." : "Auto Populate (Sundays + Public)"}
            </button>
          )}
          {canManage ? (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              Add Holiday
            </button>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Lock size={14} />
              <span>Admin access required to add holidays</span>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Add New Holiday</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="holiday-name" className="block text-sm text-slate-300 mb-1">Holiday Name *</label>
                <input
                  id="holiday-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g., Diwali, Christmas"
                  className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label htmlFor="holiday-date" className="block text-sm text-slate-300 mb-1">Date *</label>
                <input
                  id="holiday-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label htmlFor="holiday-type" className="block text-sm text-slate-300 mb-1">Type</label>
                <select
                  id="holiday-type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
                >
                  <option value="public">Public Holiday</option>
                  <option value="company">Company Holiday</option>
                  <option value="optional">Optional Holiday</option>
                </select>
              </div>
              <div>
                <label htmlFor="holiday-desc" className="block text-sm text-slate-300 mb-1">Description</label>
                <input
                  id="holiday-desc"
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional description"
                  className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-50"
              >
                {submitting ? "Adding..." : "Add Holiday"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={8} cols={5} />
      ) : holidays.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-slate-800/60 rounded-xl border border-slate-700">
          <p>No holidays added yet</p>
        </div>
      ) : (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Description</th>
                {canManage && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {holidays.map((holiday) => (
                <tr key={holiday._id} className="border-t border-slate-700 hover:bg-slate-700/30">
                  <td className="px-4 py-3 text-white">
                    {new Date(holiday.date).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{holiday.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs border ${getTypeBadge(holiday.type)} capitalize`}>
                      {holiday.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{holiday.description || "-"}</td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(holiday._id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default HolidayManagement;
