import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Activity, Filter } from "lucide-react";
import { Skeleton } from "./Skeleton";
import API_BASE from "../config/api.js";

const ActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ module: "", action: "" });

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, pagination.page, filters]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = { page: pagination.page, limit: 50 };
      if (filters.module) params.module = filters.module;
      if (filters.action) params.action = filters.action;

      const res = await axios.get(`${API_BASE}/api/activity-logs`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      if (res.data.success) {
        setLogs(res.data.logs || []);
        setPagination({
          page: res.data.pagination.page,
          total: res.data.pagination.total,
          pages: res.data.pagination.pages,
        });
      }
    } catch {
      toast.error("Failed to fetch activity logs");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, filters]);

  const getActionColor = (action) => {
    switch (action) {
      case "create": return "bg-cyan-500";
      case "update": return "bg-blue-500";
      case "delete": return "bg-rose-500";
      case "approved":
      case "approve": return "bg-teal-500";
      case "rejected":
      case "reject": return "bg-orange-500";
      case "login": return "bg-indigo-500";
      case "logout": return "bg-slate-500";
      default: return "bg-slate-500";
    }
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const modules = ["employee", "leave", "attendance", "announcement", "document", "holiday"];
  const actions = ["created", "updated", "deleted", "approved", "rejected", "login", "logout"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Activity className="text-indigo-400" />
          Activity Log
        </h2>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={16} className="text-slate-400" />
          <select
            value={filters.module}
            onChange={(e) => setFilters({ ...filters, module: e.target.value })}
            className="rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-1.5 text-sm text-white"
          >
            <option value="">All Modules</option>
            {modules.map((m) => (
              <option key={m} value={m} className="capitalize">{m}</option>
            ))}
          </select>

          <select
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            className="rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-1.5 text-sm text-white"
          >
            <option value="">All Actions</option>
            {actions.map((a) => (
              <option key={a} value={a} className="capitalize">{a}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl border" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-3">
                <Skeleton variant="avatar" className="h-8 w-8 rounded-full" />
                <div className="space-y-2">
                  <Skeleton variant="text" className="w-48" />
                  <Skeleton variant="text" className="w-32" />
                </div>
              </div>
              <Skeleton variant="text" className="w-20" />
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-slate-800/40 rounded-xl border border-slate-700">
          <Activity size={32} className="mx-auto mb-2 opacity-50" />
          <p>No activity logs found</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log._id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActionColor(log.action)} text-white text-xs font-bold`}>
                    {log.action?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white">
                      <span className="font-medium">{log.user?.name || "System"}</span>
                      <span className="text-slate-400"> {log.action} </span>
                      <span className="text-indigo-400">{log.module}</span>
                    </p>
                    {log.details && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {JSON.stringify(log.details)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500">{formatTime(log.createdAt)}</span>
                  {log.ipAddress && (
                    <p className="text-xs text-slate-600">{log.ipAddress}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-3 py-1 rounded bg-slate-700 text-white disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-slate-400">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 rounded bg-slate-700 text-white disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ActivityLog;
