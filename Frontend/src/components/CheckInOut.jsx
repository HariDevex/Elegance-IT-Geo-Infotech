import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { Download, LogIn, LogOut, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Skeleton, SkeletonTable } from "./Skeleton";
import API_BASE from "../config/api.js";

const CheckInOut = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [todayStats, setTodayStats] = useState({ checkinCount: 0, maxAllowed: 3, remaining: 3 });
  const [error, setError] = useState("");

  const loadRecords = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const firstDayOfYear = `${today.getFullYear()}-01-01`;
      const timestamp = Date.now();

      const res = await axios.get(`${API_BASE}/api/attendance/my`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { from: firstDayOfYear, to: todayStr, _t: timestamp },
      });

      setRecords(res.data.records || []);

      const todayRecords = (res.data.records || []).filter(r => r.date === todayStr);
      const todaySessions = todayRecords.flatMap(r => r.sessions || []);
      setTodayStats({
        checkinCount: todaySessions.filter(s => s.checkInAt).length,
        maxAllowed: 3,
        remaining: Math.max(0, 3 - todaySessions.filter(s => s.checkInAt).length),
      });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const handleCheckin = async () => {
    setChecking(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE}/api/checkin/checkin`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast.success(`Checked in! (${res.data.todayCount}/${res.data.maxAllowed} today)`);
        loadRecords();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Check-in failed");
    } finally {
      setChecking(false);
    }
  };

  const handleCheckout = async () => {
    setChecking(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE}/api/checkin/checkout`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast.success(`Checked out! Duration: ${res.data.session?.durationMinutes} min`);
        loadRecords();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Check-out failed");
    } finally {
      setChecking(false);
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/checkin/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success && res.data.data && res.data.data.length > 0) {
        toast.success("Excel downloaded!");
      } else {
        toast.error("No data to export");
      }
    } catch {
      toast.error("Export failed");
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const normalized = dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00.000Z`;
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-GB", { weekday: "short", month: "short", day: "numeric" });
  };

  const getTimeDiff = (start, end) => {
    if (!start || !end) return "-";
    const startDate = new Date(start);
    const endDate = new Date(end);
    const mins = Math.round((endDate - startDate) / 60000);
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Check In / Out</h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-xs transition-colors"
        >
          <Download size={14} />
          Export
        </button>
      </div>

      <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-6">
        <div className="text-center mb-6">
          <div className="text-5xl font-bold text-white mb-2">
            {todayStats.remaining}
          </div>
          <p className="text-slate-400 text-sm">Check-ins remaining today</p>
          <p className="text-slate-500 text-xs mt-1">
            {todayStats.checkinCount} / {todayStats.maxAllowed} used
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleCheckin}
            disabled={checking || todayStats.remaining <= 0}
            className="flex items-center justify-center gap-2 flex-1 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold transition-colors"
          >
            <LogIn size={18} />
            {checking ? "Processing..." : "Check In"}
          </button>
          <button
            onClick={handleCheckout}
            disabled={checking}
            className="flex items-center justify-center gap-2 flex-1 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold transition-colors"
          >
            <LogOut size={18} />
            {checking ? "Processing..." : "Check Out"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-400 text-sm">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-700 bg-slate-800/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700 bg-slate-800">
          <h3 className="text-sm font-semibold text-white">Recent Sessions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Date</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Login Time</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Check In</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Check Out</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Duration</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <SkeletonTable rows={5} cols={6} />
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No sessions yet
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  record.sessions && record.sessions.length > 0 ? (
                    record.sessions.map((session, idx) => (
                      <tr key={`${record._id}-${idx}`} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        {idx === 0 && (
                          <td rowSpan={record.sessions.length} className="px-4 py-3 text-sm text-white align-top">
                            {formatDate(record.date)}
                          </td>
                        )}
                        {idx === 0 && (
                          <td rowSpan={record.sessions.length} className="px-4 py-3 text-sm align-top">
                            <span className={`flex items-center gap-1.5 ${record.loginAt ? "text-slate-300" : "text-slate-500"}`}>
                              <Clock size={14} />
                              {formatTime(record.loginAt)}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm">
                          {session.checkInAt ? (
                            <span className="flex items-center gap-1.5 text-cyan-400">
                              <CheckCircle size={14} />
                              {formatTime(session.checkInAt)}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {session.checkOutAt ? (
                            <span className="flex items-center gap-1.5 text-amber-400">
                              <CheckCircle size={14} />
                              {formatTime(session.checkOutAt)}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-indigo-400">
                              <AlertCircle size={14} />
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">
                          {getTimeDiff(session.checkInAt, session.checkOutAt)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            session.status === "Late" ? "bg-amber-500/20 text-amber-400" :
                            session.status === "On Time" ? "bg-emerald-500/20 text-emerald-400" :
                            "bg-indigo-500/20 text-indigo-400"
                          }`}>
                            {session.status === "Late" ? <><AlertCircle size={12} /> Late</> :
                             session.status === "On Time" ? <><CheckCircle size={12} /> On Time</> :
                             <><AlertCircle size={12} /> Active</>}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr key={record._id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-sm text-white">{formatDate(record.date)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`flex items-center gap-1.5 ${record.loginAt ? "text-slate-300" : "text-slate-500"}`}>
                          <Clock size={14} />
                          {formatTime(record.loginAt)}
                        </span>
                      </td>
                      <td colSpan={4} className="px-4 py-3 text-sm text-center text-slate-500">
                        No check-in sessions
                      </td>
                    </tr>
                  )
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CheckInOut;
