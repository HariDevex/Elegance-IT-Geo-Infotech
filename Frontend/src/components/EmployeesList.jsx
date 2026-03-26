import { useEffect, useState, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { Download } from "lucide-react";
import { exportToExcel, getImageUrl } from "../utils/excel";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const EmployeesList = ({ onAddNew, onView, onEdit }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [deleteId, setDeleteId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/employees`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { search, limit: 100, page: pagination.page },
      });
      setEmployees(res.data.users || []);
      if (res.data.pagination) {
        setPagination(res.data.pagination);
      }
    } catch {
      setError("Failed to load employees");
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search, pagination.page]);

  const handleExport = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/auth/export/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success && res.data.data.length > 0) {
        exportToExcel(res.data.data, `employees_${new Date().toISOString().split("T")[0]}`, "Employees");
        toast.success("Excel downloaded!");
      } else {
        toast.error("No data to export");
      }
    } catch {
      toast.error("Export failed");
    }
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete(`${API_BASE}/api/employees/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        toast.success("Employee deleted!");
        setShowDeleteModal(false);
        setDeleteId(null);
        fetchEmployees();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete");
    }
  }, [deleteId]);

  const confirmDelete = (id) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  return (
    <div className="space-y-4">
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full mx-4 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Employee?</h3>
            <p className="text-slate-400 text-sm mb-4">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Manage Employees</h2>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs transition-colors"
          >
            <Download size={14} />
            Export
          </button>
          <button
            onClick={onAddNew}
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            + Add Employee
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          id="search-employees"
          name="search"
          type="text"
          placeholder="Search by name, email, or employee ID..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-2 text-sm text-white w-full sm:w-80"
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading...</div>
      ) : error ? (
        <div className="text-center py-8 text-rose-400">{error}</div>
      ) : employees.length === 0 ? (
        <div className="text-center py-8 text-slate-400">No employees found</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/60">
            <table className="min-w-full text-sm text-slate-200">
              <thead className="bg-slate-800 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Profile</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Employee ID</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, idx) => (
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
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div className="font-medium">{emp.name}</div>
                        <div className="text-xs text-slate-400">{emp.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{emp.employeeId || "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{emp.department || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs capitalize">
                        {emp.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                      <button onClick={() => onView?.(emp)} className="text-indigo-300 hover:text-white text-xs">
                        View
                      </button>
                      <button onClick={() => onEdit?.(emp)} className="text-sky-300 hover:text-white text-xs">
                        Edit
                      </button>
                      <button 
                        onClick={() => confirmDelete(emp._id)} 
                        className="text-rose-400 hover:text-white text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 rounded bg-slate-700 text-white disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-slate-300">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
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

export default EmployeesList;
