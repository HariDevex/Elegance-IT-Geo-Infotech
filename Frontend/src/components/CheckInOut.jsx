import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { Download } from "lucide-react";
import { exportToExcel } from "../utils/excel";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const CheckInOut = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [todayStats, setTodayStats] = useState({ checkinCount: 0, maxAllowed: 3, remaining: 3 });

  const loadRecords = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/checkin/my-records`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setRecords(res.data.records || []);
        setTodayStats(res.data.todayStats || { checkinCount: 0, maxAllowed: 3, remaining: 3 });
      }
    } catch {
      toast.error("Failed to load records");
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
        const formattedData = res.data.data.map(item => ({
          date: item.date || "",
          checkin_time: item.checkin?.time || "",
          checkout_time: item.checkout?.time || "",
          duration_minutes: item.duration || "",
          status: item.status || ""
        }));
        exportToExcel(formattedData, `checkin_checkout_${new Date().toISOString().split("T")[0]}`, "CheckIn/Out");
        toast.success("Excel downloaded!");
      } else {
        toast.error("No data to export");
      }
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Export failed");
    }
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
            className="flex-1 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold transition-colors"
          >
            {checking ? "Processing..." : "Check In"}
          </button>
          <button
            onClick={handleCheckout}
            disabled={checking}
            className="flex-1 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold transition-colors"
          >
            {checking ? "Processing..." : "Check Out"}
          </button>
        </div>
      </div>

      <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-white">Recent Sessions</h3>
        </div>
        {loading ? (
          <div className="text-center py-8 text-slate-400">Loading...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-8 text-slate-400">No sessions yet</div>
        ) : (
          <div className="divide-y divide-slate-700">
            {records.slice(0, 10).map((session, idx) => (
              <div key={idx} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">
                    {new Date(session.date).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-slate-400">
                    In: {session.checkin?.time ? new Date(session.checkin.time).toLocaleTimeString() : "-"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">
                    Out: {session.checkout?.time ? new Date(session.checkout.time).toLocaleTimeString() : "Active"}
                  </p>
                  {session.duration && (
                    <p className="text-xs text-cyan-400">{session.duration} min</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckInOut;
