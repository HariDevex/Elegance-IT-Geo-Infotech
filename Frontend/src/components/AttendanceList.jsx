import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { Download } from "lucide-react";
import { useAuth } from "../context/authContext";
import { exportToExcel, getImageUrl } from "../utils/excel";
import { Skeleton, SkeletonTable } from "./Skeleton";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const AttendanceList = () => {
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [exportFrom, setExportFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [exportTo, setExportTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [exportEmployee, setExportEmployee] = useState("all");
  const { user } = useAuth();
  const canUpdate = ["admin", "manager", "root"].includes(user?.role);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/employees?limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmployees(res.data.users || []);
    } catch {}
  };

  const loadData = async (selectedDate) => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/attendance`, {
        headers: { Authorization: `Bearer ${token}` },
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
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE}/api/attendance`,
        { userId: id, status, date },
        { headers: { Authorization: `Bearer ${token}` } }
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
      const token = localStorage.getItem("token");
      const params = { from: exportFrom, to: exportTo };
      if (exportEmployee !== "all") {
        params.userId = exportEmployee;
      }
      const res = await axios.get(`${API_BASE}/api/auth/export/attendance`, {
        headers: { Authorization: `Bearer ${token}` },
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
                          <img src={getImageUrl(emp.profileImage)} alt={emp.name} className="h-full w-full object-cover" />
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
                            emp.attendanceStatus === "Present"
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
                    {emp.checkInAt ? new Date(emp.checkInAt).toLocaleTimeString() : "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {emp.checkOutAt ? new Date(emp.checkOutAt).toLocaleTimeString() : "-"}
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

export default AttendanceList;
