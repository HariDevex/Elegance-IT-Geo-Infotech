import { useEffect, useState, memo } from "react";
import toast from "react-hot-toast";
import api from "../config/axios";
import { Download, LogIn, LogOut, Clock, CheckCircle, AlertCircle, Users, User } from "lucide-react";
import { Skeleton, SkeletonTable } from "./Skeleton";
import { useAuth } from "../context/authContext";
import { exportToExcel } from "../utils/excel";
import { formatDate as formatUI } from "../utils/format";

import { getProjectDateStr, getProjectTimeStr } from "../utils/dateUtils";

const CheckInOut = () => {
  const { user } = useAuth();
  const isAdmin = ["root", "admin", "manager"].includes(user?.role);
  const [view, setView] = useState("my"); // "my" or "all"
  const [records, setRecords] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [todayStats, setTodayStats] = useState({ checkinCount: 0, maxAllowed: 1, remaining: 1 });
  const [error, setError] = useState("");

  const loadRecords = async () => {
    setLoading(true);
    setError("");
    try {
      const today = new Date();
      const todayStr = getProjectDateStr(today);
      const firstDayOfYear = `${today.getFullYear()}-01-01`;
      const timestamp = Date.now();

      if (view === "my") {
        const res = await api.get("/attendance/my", {
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
      } else {
        const res = await api.get("/checkin/all-records", {
          params: { _t: timestamp },
        });
        setAllRecords(res.data.records || []);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const handleCheckin = async () => {
    setChecking(true);
    try {
      const res = await api.post(
        "/checkin/checkin",
        {}
      );
      if (res.data.success) {
        const maxAllowed = res.data.maxAllowed || 1;
        const todayCount = res.data.todayCount || 0;
        setTodayStats({
          checkinCount: todayCount,
          maxAllowed,
          remaining: Math.max(0, maxAllowed - todayCount),
        });
        toast.success(`Checked in! (${todayCount}/${maxAllowed} today)`);
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
      const res = await api.post(
        "/checkin/checkout",
        {}
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
      const exportUrl = view === "my" ? `/checkin/export?userId=${user._id}` : "/checkin/export";
      const res = await api.get(exportUrl);
      if (res.data.success && res.data.data.length > 0) {
        exportToExcel(res.data.data, `checkin-export-${getProjectDateStr()}`, "Check-in Records");
        toast.success("Excel downloaded!");
      } else {
        toast.error("No data to export");
      }
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Export failed");
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return "-";
    return getProjectTimeStr(new Date(isoString));
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-white">Check In / Out</h2>
          {isAdmin && (
            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
              <button
                onClick={() => setView("my")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-colors ${
                  view === "my" ? "bg-cyan-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <User size={14} />
                My Records
              </button>
              <button
                onClick={() => setView("all")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-colors ${
                  view === "all" ? "bg-cyan-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Users size={14} />
                All Accounts
              </button>
            </div>
          )}
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-xs transition-colors"
        >
          <Download size={14} />
          Export
        </button>
      </div>

      {view === "my" ? (
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
      ) : null}

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-400 text-sm">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-700 bg-slate-800/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700 bg-slate-800">
          <h3 className="text-sm font-semibold text-white">
            {view === "my" ? "Recent Sessions" : "All Account Sessions"}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                {view === "all" && <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Employee</th>}
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Date</th>
                {view === "my" && <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Login Time</th>}
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Check In</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Check Out</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Duration</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={view === "all" ? 6 : 6} className="px-4 py-8 text-center">
                    <SkeletonTable rows={5} cols={view === "all" ? 6 : 6} />
                  </td>
                </tr>
              ) : (view === "my" ? records : allRecords).length === 0 ? (
                <tr>
                  <td colSpan={view === "all" ? 6 : 6} className="px-4 py-8 text-center text-slate-400">
                    No sessions yet
                  </td>
                </tr>
              ) : view === "my" ? (
                records.map((record) => (
                  record.sessions && record.sessions.length > 0 ? (
                    record.sessions.map((session, idx) => (
                      <tr key={`${record._id}-${idx}`} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        {idx === 0 && (
                          <td rowSpan={record.sessions.length} className="px-4 py-3 text-sm text-white align-top">
                            <div>{formatUI(record.date)}</div>
                            <div className="text-[10px] text-cyan-400 font-bold mt-1 uppercase tracking-wider">
                              Total: {Math.floor(record.totalDuration / 60)}h {record.totalDuration % 60}m
                            </div>
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
                      <td className="px-4 py-3 text-sm text-white">{formatUI(record.date)}</td>
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
              ) : (
                allRecords.map((record) => (
                  record.sessions && record.sessions.length > 0 ? (
                    record.sessions.map((session, idx) => (
                      <tr key={`${record._id}-${idx}`} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        {idx === 0 && (
                          <td rowSpan={record.sessions.length} className="px-4 py-3 text-sm align-top">
                            <div className="flex flex-col">
                              <span className="text-white font-medium">{record.user?.name}</span>
                              <span className="text-slate-500 text-xs">{record.user?.employeeId}</span>
                            </div>
                          </td>
                        )}
                        {idx === 0 && (
                          <td rowSpan={record.sessions.length} className="px-4 py-3 text-sm text-slate-300 align-top">
                            <div>{formatUI(record.date)}</div>
                            <div className="text-[10px] text-cyan-400 font-bold mt-1 uppercase tracking-wider">
                              Total: {Math.floor(record.totalDuration / 60)}h {record.totalDuration % 60}m
                            </div>
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
                            session.checkOutAt ? "bg-emerald-500/20 text-emerald-400" : "bg-indigo-500/20 text-indigo-400"
                          }`}>
                            {session.checkOutAt ? "Completed" : "Active"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : null
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default memo(CheckInOut);
