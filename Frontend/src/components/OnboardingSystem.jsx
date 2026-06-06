import { memo, useEffect, useMemo, useState, useCallback } from "react";
import toast from "react-hot-toast";
import api from "../config/axios";
import { useAuth } from "../context/authContext";
import { SkeletonTable, SkeletonList } from "./Skeleton";
import { formatDate } from "../utils/format";

const taskStatusOptions = ["All", "pending", "in_progress", "completed"];

const OnboardingSystem = () => {
  const { user } = useAuth();
  const canManage = ["root", "admin", "manager"].includes(user?.role);

  const [tasks, setTasks] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showChecklistForm, setShowChecklistForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ userId: "", taskName: "", description: "", assignedTo: "", dueDate: "" });
  const [checklistForm, setChecklistForm] = useState({ userId: "", item: "" });
  const [employees, setEmployees] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const taskParams = {};
      if (statusFilter !== "All") taskParams.status = statusFilter;
      if (!canManage) taskParams.userId = user?._id;

      const [taskRes, checklistRes] = await Promise.all([
        api.get("/onboarding/tasks", { params: taskParams }),
        api.get("/onboarding/checklist", { params: canManage ? {} : { userId: user?._id } }),
      ]);
      setTasks(taskRes.data.tasks || []);
      setChecklist(checklistRes.data.checklist || []);
    } catch (err) {
      console.error("Failed to load onboarding data:", err);
      toast.error("Failed to load onboarding data");
    } finally {
      setLoading(false);
    }
  }, [canManage, user, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!showTaskForm && !showChecklistForm) return;
    const fetchEmployees = async () => {
      try {
        const res = await api.get("/employees", { params: { limit: 200 } });
        setEmployees(res.data.users || []);
      } catch (err) {
        console.error("Failed to load employees:", err);
        toast.error("Failed to load employees");
      }
    };
    fetchEmployees();
  }, [showTaskForm, showChecklistForm]);

  const filteredTasks = useMemo(() => {
    if (!search) return tasks;
    const q = search.toLowerCase();
    return tasks.filter(
      (t) =>
        (t.employee_id || "").toLowerCase().includes(q) ||
        (t.user_name || "").toLowerCase().includes(q) ||
        (t.task_name || "").toLowerCase().includes(q)
    );
  }, [tasks, search]);

  const handleCreateTask = async () => {
    if (!taskForm.userId || !taskForm.taskName) {
      toast.error("Employee and task name are required");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/onboarding/tasks", taskForm);
      toast.success("Task created");
      setShowTaskForm(false);
      setTaskForm({ userId: "", taskName: "", description: "", assignedTo: "", dueDate: "" });
      load();
    } catch (err) {
      console.error("Failed to create task:", err);
      toast.error(err.response?.data?.error || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTaskStatus = async (id, status) => {
    try {
      await api.put(`/onboarding/tasks/${id}/status`, { status });
      toast.success("Task updated");
      load();
    } catch (err) {
      console.error("Failed to update task:", err);
      toast.error(err.response?.data?.error || "Failed to update task");
    }
  };

  const handleDeleteTask = async (id) => {
    if (!confirm("Delete this task?")) return;
    try {
      await api.delete(`/onboarding/tasks/${id}`);
      toast.success("Task deleted");
      load();
    } catch (err) {
      console.error("Failed to delete task:", err);
      toast.error(err.response?.data?.error || "Failed to delete");
    }
  };

  const handleCreateChecklistItem = async () => {
    if (!checklistForm.userId || !checklistForm.item) {
      toast.error("Employee and checklist item are required");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/onboarding/checklist", checklistForm);
      toast.success("Checklist item added");
      setShowChecklistForm(false);
      setChecklistForm({ userId: "", item: "" });
      load();
    } catch (err) {
      console.error("Failed to add checklist item:", err);
      toast.error(err.response?.data?.error || "Failed to add checklist item");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleChecklist = async (id) => {
    try {
      const res = await api.put(`/onboarding/checklist/${id}/toggle`);
      setChecklist((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_completed: res.data.is_completed } : c))
      );
      toast.success(res.data.is_completed ? "Checked" : "Unchecked");
    } catch (err) {
      console.error("Failed to toggle checklist:", err);
      toast.error(err.response?.data?.error || "Failed to toggle");
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white">Onboarding System</h2>
      </div>

      {/* Tasks Section */}
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Tasks</h3>
          <div className="flex flex-wrap gap-2">
            <label htmlFor="onboarding-search" className="sr-only">Search tasks</label>
            <input
              id="onboarding-search"
              type="search"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-2 text-sm text-white w-full sm:w-64"
            />
            {canManage && taskStatusOptions.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  statusFilter === s ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-200 border border-slate-600"
                }`}
              >
                {s === "All" ? "All" : s.replace("_", " ")}
              </button>
            ))}
            {canManage && (
              <button onClick={() => setShowTaskForm(true)} className="rounded-lg px-3 py-2 text-sm font-semibold bg-cyan-600 text-white hover:bg-cyan-500">
                + New Task
              </button>
            )}
          </div>
        </div>

        {showTaskForm && canManage && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4 space-y-3 mb-4">
            <h3 className="font-semibold text-white">Create Onboarding Task</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Employee</label>
                <select
                  value={taskForm.userId}
                  onChange={(e) => setTaskForm((f) => ({ ...f, userId: e.target.value }))}
                  className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm w-full"
                >
                  <option value="">Select employee</option>
                  {employees.map((emp) => (
                    <option key={emp._id || emp.id} value={emp._id || emp.id}>
                      {emp.name} ({emp.employee_id || emp.employeeId})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Task Name</label>
                <input
                  type="text"
                  placeholder="Task name"
                  value={taskForm.taskName}
                  onChange={(e) => setTaskForm((f) => ({ ...f, taskName: e.target.value }))}
                  className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm w-full"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Assigned To (optional)</label>
                <select
                  value={taskForm.assignedTo}
                  onChange={(e) => setTaskForm((f) => ({ ...f, assignedTo: e.target.value }))}
                  className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm w-full"
                >
                  <option value="">Select assignee</option>
                  {employees.map((emp) => (
                    <option key={emp._id || emp.id} value={emp._id || emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Due Date (optional)</label>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm w-full"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs text-slate-400">Description (optional)</label>
                <textarea
                  placeholder="Task description"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowTaskForm(false)} className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm hover:bg-slate-600">
                Cancel
              </button>
              <button 
                onClick={handleCreateTask} 
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm hover:bg-cyan-500 disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/60">
          <table className="min-w-full text-sm text-slate-200">
            <thead className="bg-slate-800 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Task Name</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Assigned To</th>
                <th className="px-4 py-3 text-left">Due Date</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <SkeletonTable rows={5} cols={8} />
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">No tasks found</td>
                </tr>
              ) : (
                filteredTasks.map((t, idx) => (
                  <tr key={t.id ?? idx} className="border-t border-slate-700 hover:bg-slate-700/30">
                    <td className="px-4 py-3">{idx + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{t.user_name}</td>
                    <td className="px-4 py-3 font-medium">{t.task_name}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate text-xs text-slate-400">{t.description || "-"}</td>
                    <td className="px-4 py-3">{t.assigned_to_name || "-"}</td>
                    <td className="px-4 py-3 text-xs">{formatDate(t.due_date)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        t.status === "completed" ? "bg-cyan-500/20 text-cyan-400" :
                        t.status === "in_progress" ? "bg-amber-500/20 text-amber-400" :
                        "bg-slate-500/20 text-slate-400"
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {t.status !== "completed" && (
                          <button
                            onClick={() => handleUpdateTaskStatus(t.id, t.status === "pending" ? "in_progress" : "completed")}
                            className="text-cyan-400 hover:text-white text-xs"
                          >
                            {t.status === "pending" ? "Start" : "Complete"}
                          </button>
                        )}
                        {canManage && (
                          <button onClick={() => handleDeleteTask(t.id)} className="text-rose-400 hover:text-white text-xs">
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Checklist Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Checklist</h3>
          {canManage && (
            <button onClick={() => setShowChecklistForm(true)} className="rounded-lg px-3 py-2 text-sm font-semibold bg-cyan-600 text-white hover:bg-cyan-500">
              + Add Item
            </button>
          )}
        </div>

        {showChecklistForm && canManage && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4 space-y-3 mb-4">
            <h3 className="font-semibold text-white">Add Checklist Item</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Employee</label>
                <select
                  value={checklistForm.userId}
                  onChange={(e) => setChecklistForm((f) => ({ ...f, userId: e.target.value }))}
                  className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm w-full"
                >
                  <option value="">Select employee</option>
                  {employees.map((emp) => (
                    <option key={emp._id || emp.id} value={emp._id || emp.id}>
                      {emp.name} ({emp.employee_id || emp.employeeId})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Item</label>
                <input
                  type="text"
                  placeholder="Checklist item"
                  value={checklistForm.item}
                  onChange={(e) => setChecklistForm((f) => ({ ...f, item: e.target.value }))}
                  className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm w-full"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowChecklistForm(false)} className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm hover:bg-slate-600">
                Cancel
              </button>
              <button 
                onClick={handleCreateChecklistItem} 
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm hover:bg-cyan-500 disabled:opacity-50"
              >
                {submitting ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          {loading ? (
            <SkeletonList />
          ) : checklist.length === 0 ? (
            <p className="text-center text-slate-400 py-4">No checklist items</p>
          ) : (
            <div className="space-y-2">
              {checklist.map((item, idx) => (
                <div
                  key={item.id ?? idx}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-700/30 cursor-pointer"
                  onClick={() => handleToggleChecklist(item.id)}
                >
                  <div
                    className={`h-5 w-5 rounded border-2 flex items-center justify-center text-xs ${
                      item.is_completed
                        ? "bg-cyan-500 border-cyan-500 text-white"
                        : "border-slate-500"
                    }`}
                  >
                    {item.is_completed && "✓"}
                  </div>
                  <span className={`text-sm ${item.is_completed ? "line-through text-slate-500" : "text-slate-200"}`}>
                    {item.item}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(OnboardingSystem);
