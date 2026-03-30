import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { Download } from "lucide-react";
import { exportToExcel } from "../utils/excel";
import { Skeleton, SkeletonTable } from "./Skeleton";
import API_BASE from "../config/api.js";

const LoginLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: "", search: "" });

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/auth/login-logs`, {
        headers: { Authorization: `Bearer ${token}` },
        params: filter.status ? { status: filter.status } : {},
      });
      if (res.data.success) {
        setLogs(res.data.logs || []);
      }
    } catch {
      toast.error("Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, [filter.status]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs, filter.status]);

  const handleExport = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/auth/export/login-logs`, {
        headers: { Authorization: `Bearer ${token}` },
        params: filter.status ? { status: filter.status } : {},
      });
      if (res.data.success && res.data.data.length > 0) {
        exportToExcel(res.data.data, `login_logs_${new Date().toISOString().split("T")[0]}`, "Login Logs");
        toast.success("Excel downloaded!");
      } else {
        toast.error("No data to export");
      }
    } catch {
      toast.error("Export failed");
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (!filter.search) return true;
    const search = filter.search.toLowerCase();
    return (
      log.user?.name?.toLowerCase().includes(search) ||
      log.user?.email?.toLowerCase().includes(search) ||
      log.ipAddress?.includes(search)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Login Logs</h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-xs transition-colors"
        >
          <Download size={14} />
          Export
        </button>
      </div>

      <div className="flex gap-2">
        {["", "success", "failed"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter((f) => ({ ...f, status }))}
            className={`px-3 py-1.5 rounded-lg text-xs ${
              filter.status === status
                ? "bg-indigo-600 text-white"
                : "bg-slate-700 text-slate-300 hover:text-white"
            }`}
          >
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonTable rows={8} cols={5} />
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-8 text-slate-400">No logs found</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/60">
          <table className="min-w-full text-sm text-slate-200">
            <thead className="bg-slate-800 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">IP Address</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log._id} className="border-t border-slate-700 hover:bg-slate-700/30">
                  <td className="px-4 py-3 whitespace-nowrap">{log.user?.name || "-"}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-400">
                    {log.user?.email || "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">{log.ipAddress || "-"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        log.status === "success"
                          ? "bg-cyan-500/20 text-cyan-300"
                          : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {new Date(log.createdAt).toLocaleDateString()}{" "}
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LoginLogs;
