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
    const [year, month] = getProjectDateStr(d).split("-").map(Number);
    return `${year}-${String(month).padStart(2, "0")}-01`;
  });
  const [exportTo, setExportTo] = useState(() => getProjectDateStr());
  const [exportEmployee, setExportEmployee] = useState("all");
  
  const { user } = useAuth();
  const canUpdate = ["admin", "manager", "root"].includes(user?.role);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/employees", { params: { limit: 500 } });
      const allUsers = res.data.users || [];
      setEmployees(allUsers);
      return allUsers;
    } catch {
      setError("Failed to load employees");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async (selectedDate, allEmployees) => {
    setLoading(true);
    try {
      const res = await api.get("/attendance", {
        params: { date: selectedDate },
      });

      const statusMap = {};
      (res.data.records || []).forEach((r) => {
        // Map by internal id or employee_id
        const key = r.user?._id || r.user?.employeeId;
        statusMap[key] = r;
      });

      const mergedRows = allEmployees.map((emp) => {
        const att = statusMap[emp._id] || statusMap[emp.employeeId];
        return {
          ...emp,
          attendanceStatus: att?.status || "Pending",
          checkInAt: att?.checkInAt,
          checkOutAt: att?.checkOutAt,
        };
      });

      setRows(mergedRows);
    } catch {
      toast.error("Failed to load attendance records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData().then((allEmps) => {
      if (allEmps.length > 0) {
        loadAttendance(date, allEmps);
      }
    });
  }, [date]);

  const setStatus = async (empId, status) => {
    try {
      await api.post(
        "/attendance",
        { userId: empId, status, date }
      );
      toast.success(`Marked as ${status}`);
      loadAttendance(date, employees);
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
      if (exportEmployee !== "all") params.userId = exportEmployee;
      
      const res = await api.get("/auth/export/attendance", { params });
      if (res.data.success && res.data.data.length > 0) {
        const fileName = exportEmployee !== "all" 
          ? `attendance_${exportEmployee}_${exportFrom}_to_${exportTo}`
          : `attendance_${exportFrom}_to_${exportTo}`;
        exportToExcel(res.data.data, fileName, "Attendance");
        toast.success("Excel downloaded!");
      } else {
        toast.error("No data found for selected range");
      }
    } catch {
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
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>{emp.name}</option>
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
        <label htmlFor="att-date" className="text-sm text-slate-400 mr-2 flex items-center">Select date:</label>
        <input
          id="att-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-2 text-white"
        />
      </div>

      {loading && rows.length === 0 ? (
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
                          <img src={getImageUrl(emp.profileImage)} alt={emp.name} className="h-full w-full object-cover" loading="lazy" onError={(e) => { e.target.style.display = 'none' }} />
                        ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs text-white">
                          {(emp.name || "NA").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-white">{emp.name}</div>
                    <div className="text-[10px] text-slate-500">{emp.employeeId}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{emp.department || "-"}</td>
                  <td className="px-4 py-3">
                    {canUpdate ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setStatus(emp._id, "Present")}
                          className={`px-3 py-1 rounded text-xs transition-colors ${
                            ["Present", "On Time", "Late"].includes(emp.attendanceStatus)
                              ? "bg-cyan-500/30 text-cyan-300 font-bold"
                              : "bg-slate-700 text-slate-300 hover:text-white"
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => setStatus(emp._id, "Absent")}
                          className={`px-3 py-1 rounded text-xs transition-colors ${
                            emp.attendanceStatus === "Absent"
                              ? "bg-rose-500/30 text-rose-300 font-bold"
                              : "bg-slate-700 text-slate-300 hover:text-white"
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    ) : (
                      <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold ${
                        ["Present", "On Time"].includes(emp.attendanceStatus) ? "bg-emerald-500/20 text-emerald-400" :
                        emp.attendanceStatus === "Late" ? "bg-amber-500/20 text-amber-400" :
                        "bg-rose-500/20 text-rose-400"
                      }`}>{emp.attendanceStatus}</span>
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
