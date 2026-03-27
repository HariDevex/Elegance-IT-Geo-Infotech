import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { useAuth } from "../context/authContext";
import AttendanceBarChart from "./charts/AttendanceBarChart";
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const STANDARD_CHECK_IN = "09:30";
const STANDARD_CHECK_OUT = "18:00";

const EmployeeAttendanceView = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
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
      const firstDayOfYear = `${new Date().getFullYear()}-01-01`;
      const res = await axios.get(`${API_BASE}/api/attendance/my`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { from: firstDayOfYear, to: today },
      });
      setRecords(res.data.records || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update");
      toast.error(err.response?.data?.error);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatus = (record) => {
    if (!record.checkInAt) return { label: "Absent", color: "text-rose-400", bg: "bg-rose-500/20" };
    
    const checkInTime = record.checkInAt.split("T")[1]?.substring(0, 5);
    const isLate = checkInTime > STANDARD_CHECK_IN;
    
    return {
      label: isLate ? "Late" : "On Time",
      color: isLate ? "text-amber-400" : "text-emerald-400",
      bg: isLate ? "bg-amber-500/20" : "bg-emerald-500/20",
    };
  };

  const getTimeDiff = (start, end) => {
    if (!start || !end) return "-";
    const [sh, sm] = start.split("T")[1].substring(0, 5).split(":").map(Number);
    const [eh, em] = end.split("T")[1].substring(0, 5).split(":").map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return `${hours}h ${minutes}m`;
  };

  const filteredRecords = useMemo(() => {
    if (filter === "all") return records;
    if (filter === "late") return records.filter(r => {
      if (!r.checkInAt) return false;
      const checkInTime = r.checkInAt.split("T")[1]?.substring(0, 5);
      return checkInTime > STANDARD_CHECK_IN;
    });
    if (filter === "absent") return records.filter(r => r.status === "Absent");
    if (filter === "present") return records.filter(r => r.status === "Present");
    return records;
  }, [records, filter]);

  const formatTime = (isoString) => {
    if (!isoString) return "-";
    return isoString.split("T")[1]?.substring(0, 5) || "-";
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
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
            className="px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold disabled:opacity-50 text-sm"
          >
            {actionLoading ? "..." : "Check In"}
          </button>
          <button
            onClick={() => act("checkout")}
            disabled={actionLoading}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50 text-sm"
          >
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

      <div className="flex flex-wrap gap-2">
        {["all", "present", "late", "absent"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-indigo-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Date</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Login Time</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Check In</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Check Out</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Work Duration</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No attendance records found
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const status = getStatus(record);
                  return (
                    <tr key={record._id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-sm text-white">
                        {formatDate(record.date)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`flex items-center gap-1.5 ${record.loginAt ? "text-slate-300" : "text-slate-500"}`}>
                          <Clock size={14} />
                          {formatTime(record.loginAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {record.checkInAt ? (
                          <span className="flex items-center gap-1.5 text-cyan-400">
                            <CheckCircle size={14} />
                            {formatTime(record.checkInAt)}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <XCircle size={14} />
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {record.checkOutAt ? (
                          <span className="flex items-center gap-1.5 text-amber-400">
                            <CheckCircle size={14} />
                            {formatTime(record.checkOutAt)}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <XCircle size={14} />
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {getTimeDiff(record.checkInAt, record.checkOutAt)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                          {record.status === "Absent" ? (
                            <><XCircle size={12} /> Absent</>
                          ) : record.checkInAt && record.checkInAt.split("T")[1]?.substring(0, 5) > STANDARD_CHECK_IN ? (
                            <><AlertCircle size={12} /> Late</>
                          ) : (
                            <><CheckCircle size={12} /> On Time</>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmployeeAttendanceView;
