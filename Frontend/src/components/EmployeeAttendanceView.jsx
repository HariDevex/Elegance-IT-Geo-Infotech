import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { useAuth } from "../context/authContext";
import AttendanceBarChart from "./charts/AttendanceBarChart";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const EmployeeAttendanceView = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const firstDayOfYear = `${new Date().getFullYear()}-01-01`;
        const today = new Date().toISOString().split("T")[0];

        const res = await axios.get(`${API_BASE}/api/attendance`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { from: firstDayOfYear, to: today, userId: user?._id },
        });

        const mine = (res.data.records || []).filter((r) => r.user?._id === user?._id);
        setRecords(mine);
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
      const res = await axios.get(`${API_BASE}/api/attendance`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { from: firstDayOfYear, to: today, userId: user?._id },
      });
      setRecords((res.data.records || []).filter((r) => r.user?._id === user?._id));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update");
      toast.error(err.response?.data?.error);
    } finally {
      setActionLoading(false);
    }
  };

  const last7Data = useMemo(() => {
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayLabel = labels[d.getDay()];
      const present = records.some(
        (r) => r.status === "Present" && new Date(r.date).toDateString() === d.toDateString()
      );
      arr.push({ day: dayLabel, present: present ? 1 : 0 });
    }
    return arr;
  }, [records]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">Attendance</h2>
        </div>
        <div className="h-48 flex items-center justify-center">
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white">Attendance</h2>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => act("checkin")}
          disabled={actionLoading}
          className="px-6 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold disabled:opacity-50"
        >
          {actionLoading ? "..." : "Check In"}
        </button>
        <button
          onClick={() => act("checkout")}
          disabled={actionLoading}
          className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50"
        >
          {actionLoading ? "..." : "Check Out"}
        </button>
        {actionMsg && <span className="text-sm text-cyan-300">{actionMsg}</span>}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-400 text-sm">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-6">
        <h3 className="text-lg font-semibold mb-4">Last 7 Days</h3>
        <div className="h-48">
          <AttendanceBarChart data={last7Data} />
        </div>
      </div>
    </div>
  );
};

export default EmployeeAttendanceView;
