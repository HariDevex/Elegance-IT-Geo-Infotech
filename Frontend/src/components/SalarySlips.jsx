import { memo, useEffect, useMemo, useState, useCallback } from "react";
import toast from "react-hot-toast";
import api from "../config/axios";
import { useAuth } from "../context/authContext";
import { SkeletonTable } from "./Skeleton";
import { getProjectDateStr } from "../utils/dateUtils";

const SalarySlips = () => {
  const { user } = useAuth();
  const canManage = ["root", "admin", "manager"].includes(user?.role);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (yearFilter) params.year = yearFilter;
      if (!canManage) params.userId = user?._id;
      const res = await api.get("/salary-slips", { params });
      setRows(res.data.slips || []);
    } catch (err) {
      console.error("Failed to load salary slips:", err);
      toast.error("Failed to load salary slips");
    } finally {
      setLoading(false);
    }
  }, [canManage, user, yearFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        (r.employee_id || "").toLowerCase().includes(q) ||
        (r.user_name || "").toLowerCase().includes(q) ||
        (r.month || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const handleDownload = async (id) => {
    try {
      await api.put(`/salary-slips/${id}/download`);
      toast.success("Download recorded");
      load();
    } catch (err) {
      console.error("Failed to record download:", err);
      toast.error(err.response?.data?.error || "Failed to record download");
    }
  };

  const renderRows = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={canManage ? 11 : 9} className="px-4 py-12 text-center">
            <SkeletonTable rows={5} cols={canManage ? 11 : 9} />
          </td>
        </tr>
      );
    }
    if (filtered.length === 0) {
      return (
        <tr>
          <td colSpan={canManage ? 11 : 9} className="px-4 py-8 text-center text-slate-400">No salary slips found</td>
        </tr>
      );
    }
    return filtered.map((r, idx) => (
      <tr key={r.id ?? idx} className="border-t border-slate-700 hover:bg-slate-700/30">
        <td className="px-4 py-3">{idx + 1}</td>
        {canManage && <td className="px-4 py-3">{r.employee_id}</td>}
        {canManage && <td className="px-4 py-3 whitespace-nowrap">{r.user_name}</td>}
        <td className="px-4 py-3">{r.month}</td>
        <td className="px-4 py-3">{r.year}</td>
        <td className="px-4 py-3">{r.basic_pay}</td>
        <td className="px-4 py-3">{r.allowances}</td>
        <td className="px-4 py-3">{r.deductions}</td>
        <td className="px-4 py-3 font-semibold text-cyan-400">{r.net_pay}</td>
        <td className="px-4 py-3 text-xs">{r.downloaded_at ? getProjectDateStr(new Date(r.downloaded_at)) : "-"}</td>
        <td className="px-4 py-3">
          <button onClick={() => handleDownload(r.id)} className="text-cyan-400 hover:text-white text-xs">
            Mark Downloaded
          </button>
        </td>
      </tr>
    ));
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white">Salary Slips</h2>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label htmlFor="slips-search" className="sr-only">Search slips</label>
        <input
          id="slips-search"
          type="search"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-2 text-sm text-white w-full sm:w-64"
        />
        <div className="flex gap-2">
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-sm text-white"
          >
            <option value="">All Years</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/60">
        <table className="min-w-full text-sm text-slate-200">
          <thead className="bg-slate-800 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              {canManage && <th className="px-4 py-3 text-left">Employee ID</th>}
              {canManage && <th className="px-4 py-3 text-left">Name</th>}
              <th className="px-4 py-3 text-left">Month</th>
              <th className="px-4 py-3 text-left">Year</th>
              <th className="px-4 py-3 text-left">Basic</th>
              <th className="px-4 py-3 text-left">Allowances</th>
              <th className="px-4 py-3 text-left">Deductions</th>
              <th className="px-4 py-3 text-left">Net Pay</th>
              <th className="px-4 py-3 text-left">Downloaded</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {renderRows()}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default memo(SalarySlips);
