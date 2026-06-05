import { memo, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../config/axios";
import { Download } from "lucide-react";
import { useAuth } from "../context/authContext";
import { exportToExcel, getImageUrl } from "../utils/excel";
import { Skeleton, SkeletonTable } from "./Skeleton";

import { getProjectDateStr, getProjectTimeStr } from "../utils/dateUtils.js";

const AttendanceList = () => {
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [date, setDate] = useState(() => getProjectDateStr());
  const [exportFrom, setExportFrom] = useState(() => {
    const d = new Date();
    // Use project-aware date components
    const [year, month] = getProjectDateStr(d).split("-").map(Number);
    return `${year}-${String(month).padStart(2, "0")}-01`;
  });
  const [exportTo, setExportTo] = useState(() => getProjectDateStr());
  const [exportEmployee, setExportEmployee] = useState("all");
  const { user } = useAuth();
  const canUpdate = ["admin", "manager", "root"].includes(user?.role);

  const fetchEmployees = async () => {
    try {
      const res = await api.get("/employees?limit=500");
      setEmployees(res.data.users || []);
    } catch { /* empty */ }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const loadData = async (selectedDate) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/attendance", {
        params: { date: selectedDate },
      });

      const statusByUser = {};
      (res.data.records || []).forEach((r) => {
        statusByUser[r.user?._id] = r;
      });

      const employees = res.data.records || [];
      const uniqueEmployees = [];
      const seen = new Set();
      employees.forEach((r) => {
        if (!seen.has(r.user?._id)) {
          seen.add(r.user?._id);
          uniqueEmployees.push({
            ...r.user,
            attendanceStatus: statusByUser[r.user?._id]?.status || "Pending",
            checkInAt: statusByUser[r.user?._id]?.checkInAt,
            checkOutAt: statusByUser[r.user?._id]?.checkOutAt,
          });
        }
      });

      setRows(uniqueEmployees);
    } catch {
      setError("Failed to load attendance");
      toast.error("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(date);
  }, [date]);

  const setStatus = async (id, status) => {
    try {
      await api.post(
        "/attendance",
        { userId: id, status, date }
      );
      toast.success(`Marked as ${status}`);
      loadData(date);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update");
    }
  };

  const handleExport = async () => {
    if (!exportFrom || !exportTo) {
      toast.error("Please select date range");
      return;
    }
    try {
      const params = { from: exportFrom, to: exportTo };
      if (exportEmployee !== "all") {
        params.userId = exportEmployee;
      }
      const res = await api.get("/auth/export/attendance", {
        params,
      });
      if (res.data.success && res.data.data.length > 0) {
        const fileName = exportEmployee !== "all" 
          ? `attendance_${exportEmployee}_${exportFrom}_to_${exportTo}`
          : `attendance_${exportFrom}_to_${exportTo}`;
        exportToExcel(res.data.data, fileName, "Attendance");
        toast.success("Excel downloaded!");
      } else {
        toast.error("No data to export for selected date range");
      }
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Export failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-semibold text-white">Mark Attendance</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-400">Export:</span>
          <select
            value={exportEmployee}
            onChange={(e) => setExportEmployee(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-1.5 text-white text-sm"
          >
            <option value="all">All Employees</option>
            {employees.map((emp, idx) => (
              <option key={emp._id ?? idx} value={emp._id}>{emp.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={exportFrom}
            onChange={(e) => setExportFrom(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-1.5 text-white text-sm"
          />
          <span className="text-sm text-slate-400">to</span>
          <input
            type="date"
            value={exportTo}
            onChange={(e) => setExportTo(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-1.5 text-white text-sm"
          />
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-xs transition-colors"
          >
            <Download size={14} />
            Export Excel
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <label htmlFor="att-date" className="text-sm text-slate-400 mr-2">Select date:</label>
        <input
          id="att-date"
          name="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-2 text-white"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={10} cols={7} />
      ) : error ? (
        <div className="text-center py-8 text-rose-400">{error}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-8 text-slate-400">No employees found</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/60">
          <table className="min-w-full text-sm text-slate-200">
            <thead className="bg-slate-800 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Profile</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Check In</th>
                <th className="px-4 py-3 text-left">Check Out</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((emp, idx) => (
                <tr key={emp._id || idx} className="border-t border-slate-700 hover:bg-slate-700/30">
                  <td className="px-4 py-3">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="h-10 w-10 rounded-full bg-slate-700 overflow-hidden">
                        {emp.profileImage ? (
                          <img src={getImageUrl(emp.profileImage)} alt={emp.name} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs text-white">
                          {(emp.name || "NA").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{emp.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{emp.department || "-"}</td>
                  <td className="px-4 py-3">
                    {canUpdate ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setStatus(emp._id, "Present")}
                          className={`px-3 py-1 rounded text-xs ${
                            ["Present", "On Time", "Late"].includes(emp.attendanceStatus)
                              ? "bg-cyan-500/30 text-cyan-300"
                              : "bg-slate-700 text-slate-300 hover:text-white"
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => setStatus(emp._id, "Absent")}
                          className={`px-3 py-1 rounded text-xs ${
                            emp.attendanceStatus === "Absent"
                              ? "bg-rose-500/30 text-rose-300"
                              : "bg-slate-700 text-slate-300 hover:text-white"
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">{emp.attendanceStatus}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {emp.checkInAt ? getProjectTimeStr(new Date(emp.checkInAt)) : "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {emp.checkOutAt ? getProjectTimeStr(new Date(emp.checkOutAt)) : "-"}
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

export default memo(AttendanceList);
