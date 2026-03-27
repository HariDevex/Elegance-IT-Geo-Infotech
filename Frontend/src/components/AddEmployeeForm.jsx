import { useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const AddEmployeeForm = () => {
  const emptyForm = {
    name: "",
    email: "",
    password: "",
    employeeId: "",
    dob: "",
    gender: "",
    maritalStatus: "",
    department: "",
    salary: "",
    role: "developer",
    designation: "",
  };

  const [form, setForm] = useState(emptyForm);
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
      const res = await axios.post(`${API_BASE}/api/employees`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.data.success) {
        setSuccess("Employee added successfully!");
        toast.success("Employee added!");
        setForm(emptyForm);
        setFile(null);
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to add employee";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Add New Employee</h2>
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
            <label htmlFor="emp-name" className="text-sm text-slate-300">Name</label>
            <input
              id="emp-name"
              name="name"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="emp-email" className="text-sm text-slate-300">Email</label>
            <input
              id="emp-email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="emp-password" className="text-sm text-slate-300">Password</label>
            <div className="relative">
              <input
                id="emp-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                required
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
            <label htmlFor="emp-id" className="text-sm text-slate-300">Employee ID</label>
            <input
              id="emp-id"
              name="employeeId"
              type="text"
              value={form.employeeId}
              onChange={(e) => update("employeeId", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="emp-designation" className="text-sm text-slate-300">Designation</label>
            <input
              id="emp-designation"
              name="designation"
              type="text"
              value={form.designation}
              onChange={(e) => update("designation", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="emp-department" className="text-sm text-slate-300">Department</label>
            <input
              id="emp-department"
              name="department"
              type="text"
              value={form.department}
              onChange={(e) => update("department", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="emp-dob" className="text-sm text-slate-300">Date of Birth</label>
            <input
              id="emp-dob"
              name="dob"
              type="date"
              value={form.dob}
              onChange={(e) => update("dob", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="emp-salary" className="text-sm text-slate-300">Salary</label>
            <input
              id="emp-salary"
              name="salary"
              type="number"
              value={form.salary}
              onChange={(e) => update("salary", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="emp-gender" className="text-sm text-slate-300">Gender</label>
            <select
              id="emp-gender"
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
            <label htmlFor="emp-marital" className="text-sm text-slate-300">Marital Status</label>
            <select
              id="emp-marital"
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
            <label htmlFor="emp-role" className="text-sm text-slate-300">Role</label>
            <select
              id="emp-role"
              name="role"
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
              required
            >
              <option value="developer">Developer</option>
              <option value="teamlead">Team Lead</option>
              <option value="manager">Manager</option>
              <option value="hr">HR</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="emp-profile" className="text-sm text-slate-300">Profile Image</label>
            <input
              id="emp-profile"
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
          {loading ? "Adding..." : "Add Employee"}
        </button>
      </form>
    </div>
  );
};

export default AddEmployeeForm;
