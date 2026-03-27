import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { useAuth } from "../context/authContext";
import { Clock, CheckCircle, XCircle, AlertCircle, LogIn, LogOut } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const EmployeeAttendanceView = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const firstDayOfYear = `${new Date().getFullYear()}-01-01`;
      const today = new Date().toISOString().split("T")[0];

      const res = await axios.get(`${API_BASE}/api/attendance/my`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { from: firstDayOfYear, to: today },
      });

      setRecords(res.data.records || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load attendance");
      toast.error("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?._id) load();
  }, [user]);

  const act = async (action) => {
    setActionLoading(true);
    setActionMsg("");
    setError("");
    try {
      const token = localStorage.getItem("token");
      const today = new Date().toISOString().split("T")[0];
      await axios.post(
        `${API_BASE}/api/attendance`,
        { userId: user?._id, date: today, action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const msg = action === "checkin" ? "Checked in successfully!" : "Checked out successfully!";
      setActionMsg(msg);
      toast.success(msg);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update");
      toast.error(err.response?.data?.error);
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">My Attendance</h2>
        </div>
        <div className="h-48 flex items-center justify-center">
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-semibold text-white">My Attendance</h2>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => act("checkin")}
            disabled={actionLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold disabled:opacity-50 text-sm"
          >
            <LogIn size={16} />
            {actionLoading ? "..." : "Check In"}
          </button>
          <button
            onClick={() => act("checkout")}
            disabled={actionLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold disabled:opacity-50 text-sm"
          >
            <LogOut size={16} />
            {actionLoading ? "..." : "Check Out"}
          </button>
          {actionMsg && <span className="text-sm text-cyan-300">{actionMsg}</span>}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-400 text-sm">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-700 bg-slate-800/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800">
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Date</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Login Time</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Check In</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Check Out</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Duration</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No attendance records found
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
                            <span className="flex items-center gap-1.5 text-slate-500">
                              <XCircle size={14} />
                              -
                            </span>
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

export default EmployeeAttendanceView;
