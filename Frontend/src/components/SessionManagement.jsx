import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { Monitor, Smartphone, Globe, Clock, Trash2, LogOut, Shield, AlertCircle } from "lucide-react";
import { Skeleton } from "./Skeleton";
import API_BASE from "../config/api.js";

const SessionManagement = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [terminating, setTerminating] = useState(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/auth/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions(res.data.sessions || []);
    } catch {
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const terminateSession = async (sessionId) => {
    setTerminating(sessionId);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete(`${API_BASE}/api/auth/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        toast.success("Session terminated");
        fetchSessions();
      }
    } catch {
      toast.error("Failed to terminate session");
    } finally {
      setTerminating(null);
    }
  };

  const terminateAllSessions = async () => {
    if (!confirm("Are you sure you want to logout from all other sessions?")) return;
    
    setTerminating("all");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete(`${API_BASE}/api/auth/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        toast.success("All other sessions terminated");
        fetchSessions();
      }
    } catch {
      toast.error("Failed to terminate sessions");
    } finally {
      setTerminating(null);
    }
  };

  const getDeviceIcon = (deviceType) => {
    if (deviceType === "mobile") return <Smartphone size={18} className="text-cyan-400" />;
    return <Monitor size={18} className="text-indigo-400" />;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      year: "numeric"
    });
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", { 
      hour: "2-digit", 
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Active Sessions</h2>
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield size={24} className="text-cyan-400" />
          <div>
            <h2 className="text-xl font-semibold text-white">Active Sessions</h2>
            <p className="text-sm text-slate-400">{sessions.length} active session(s)</p>
          </div>
        </div>
        {sessions.length > 1 && (
          <button
            onClick={terminateAllSessions}
            disabled={terminating === "all"}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition"
          >
            <LogOut size={16} />
            {terminating === "all" ? "Terminating..." : "Terminate All Others"}
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800">
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Device</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Location</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Last Active</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Status</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No active sessions found
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session._id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {getDeviceIcon(session.deviceType)}
                        <div>
                          <p className="text-white font-medium">{session.device || "Unknown Device"}</p>
                          <p className="text-slate-500 text-xs">{session.browser || "Unknown Browser"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Globe size={14} className="text-slate-400" />
                        <span className="text-slate-300 text-sm">{session.location || "Unknown"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" />
                        <div>
                          <p className="text-white text-sm">{formatDate(session.lastActiveAt)}</p>
                          <p className="text-slate-500 text-xs">{formatTime(session.lastActiveAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {session.isCurrent ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Current
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!session.isCurrent && (
                        <button
                          onClick={() => terminateSession(session._id)}
                          disabled={terminating === session._id}
                          className="p-2 rounded-lg hover:bg-rose-500/20 text-rose-400 transition disabled:opacity-50"
                          title="Terminate session"
                        >
                          {terminating === session._id ? (
                            <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
        <AlertCircle size={20} className="text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="text-cyan-300 font-medium">Security Tip</p>
          <p className="text-slate-400 mt-1">
            If you see unfamiliar sessions, terminate them immediately and change your password. 
            Always logout from shared or public devices.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SessionManagement;
