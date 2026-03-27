import { useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const EditEmployeeForm = ({ employee, onDone }) => {
  if (!employee) {
    return (
      <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6">
        <p className="text-slate-400 text-center">No employee data available</p>
      </div>
    );
  }

  const [form, setForm] = useState({
    name: employee.name || "",
    email: employee.email || "",
    employeeId: employee.employeeId || "",
    dob: employee.dob ? employee.dob.slice(0, 10) : "",
    gender: employee.gender || "",
    maritalStatus: employee.maritalStatus || "",
    department: employee.department || "",
    designation: employee.designation || "",
    salary: employee.salary || "",
    role: employee.role || "developer",
    newPassword: "",
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== "") fd.append(k, v);
      });
      if (file) fd.append("profileImage", file);

      const token = localStorage.getItem("token");
      const res = await axios.put(`${API_BASE}/api/employees/${employee._id}`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.data.success) {
        setSuccess("Employee updated!");
        toast.success("Employee updated!");
        setTimeout(onDone, 1500);
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to update";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Edit Employee</h2>
        <button
          onClick={onDone}
          className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm hover:bg-slate-600"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label htmlFor="edit-name" className="text-sm text-slate-300">Name</label>
            <input
              id="edit-name"
              name="name"
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-email" className="text-sm text-slate-300">Email</label>
            <input
              id="edit-email"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-password" className="text-sm text-slate-300">New Password (leave blank)</label>
            <div className="relative">
              <input
                id="edit-password"
                name="newPassword"
                type={showPassword ? "text" : "password"}
                value={form.newPassword}
                onChange={(e) => update("newPassword", e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 pr-10 text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-emp-id" className="text-sm text-slate-300">Employee ID</label>
            <input
              id="edit-emp-id"
              name="employeeId"
              type="text"
              value={form.employeeId}
              onChange={(e) => update("employeeId", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-designation" className="text-sm text-slate-300">Designation</label>
            <input
              id="edit-designation"
              name="designation"
              type="text"
              value={form.designation}
              onChange={(e) => update("designation", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-department" className="text-sm text-slate-300">Department</label>
            <input
              id="edit-department"
              name="department"
              type="text"
              value={form.department}
              onChange={(e) => update("department", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-dob" className="text-sm text-slate-300">Date of Birth</label>
            <input
              id="edit-dob"
              name="dob"
              type="date"
              value={form.dob}
              onChange={(e) => update("dob", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-salary" className="text-sm text-slate-300">Salary</label>
            <input
              id="edit-salary"
              name="salary"
              type="number"
              value={form.salary}
              onChange={(e) => update("salary", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-gender" className="text-sm text-slate-300">Gender</label>
            <select
              id="edit-gender"
              name="gender"
              value={form.gender}
              onChange={(e) => update("gender", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
            >
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-marital" className="text-sm text-slate-300">Marital Status</label>
            <select
              id="edit-marital"
              name="maritalStatus"
              value={form.maritalStatus}
              onChange={(e) => update("maritalStatus", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
            >
              <option value="">Select</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-role" className="text-sm text-slate-300">Role</label>
            <select
              id="edit-role"
              name="role"
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
            >
              <option value="developer">Developer</option>
              <option value="teamlead">Team Lead</option>
              <option value="manager">Manager</option>
              <option value="hr">HR</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-profile" className="text-sm text-slate-300">Profile Image</label>
            <input
              id="edit-profile"
              name="profileImage"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white file:font-semibold hover:file:bg-indigo-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-white font-semibold hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
};

export default EditEmployeeForm;
