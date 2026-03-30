import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { Eye, EyeOff, Info, UserPlus, Copy, CheckCircle } from "lucide-react";
import API_BASE from "../config/api.js";

const BRANCHES = [
  { value: "bengaluru", label: "Bengaluru", prefix: "EJB" },
  { value: "krishnagiri", label: "Krishnagiri", prefix: "EJK" },
];

const ROLES = [
  { value: "developer", label: "Developer" },
  { value: "teamlead", label: "Team Lead" },
  { value: "manager", label: "Manager" },
  { value: "hr", label: "HR" },
  { value: "admin", label: "Admin" },
];

const AddEmployeeForm = ({ onEmployeeAdded }) => {
  const emptyForm = {
    name: "",
    email: "",
    password: "",
    branch: "",
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
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [newEmployeeId, setNewEmployeeId] = useState("");
  const [newEmployeePassword, setNewEmployeePassword] = useState("");
  const [copied, setCopied] = useState(false);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  useEffect(() => {
    if (form.branch) {
      const branchInfo = BRANCHES.find(b => b.value === form.branch);
      if (branchInfo) {
        // Show format preview
      }
    }
  }, [form.branch]);

  const copyToClipboard = (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
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
        const empId = res.data.user?.employeeId;
        setNewEmployeeId(empId);
        setNewEmployeePassword(form.password);
        toast.success(`Employee added!`);
        setShowSuccessModal(true);
        setForm(emptyForm);
        setFile(null);
        if (onEmployeeAdded) onEmployeeAdded();
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to add employee";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const selectedBranch = BRANCHES.find(b => b.value === form.branch);

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



      <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-start gap-3">
          <Info size={20} className="text-cyan-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <p className="font-semibold text-white mb-1">Login Information:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Employees will login using their <strong className="text-cyan-400">Employee ID</strong> (auto-generated)</li>
              <li>Email is only used for sending notifications</li>
              <li>ID format: <strong className="text-cyan-400">{selectedBranch?.prefix || 'XXX'}{currentYear}XXX</strong> (10 characters)</li>
            </ul>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label htmlFor="emp-name" className="text-sm text-slate-300">Name <span className="text-rose-400">*</span></label>
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
            <label htmlFor="emp-branch" className="text-sm text-slate-300">Branch <span className="text-rose-400">*</span></label>
            <select
              id="emp-branch"
              name="branch"
              value={form.branch}
              onChange={(e) => update("branch", e.target.value)}
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
            >
              <option value="">Select Branch</option>
              {BRANCHES.map(b => (
                <option key={b.value} value={b.value}>{b.label} ({b.prefix}{currentYear}XXX)</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="emp-email" className="text-sm text-slate-300">Email (for notifications)</label>
            <input
              id="emp-email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="emp-id" className="text-sm text-slate-300">Employee ID</label>
            <div className="relative">
              <input
                id="emp-id"
                name="employeeId"
                type="text"
                value={selectedBranch ? `${selectedBranch.prefix}${currentYear}???` : ""}
                disabled
                placeholder="Select branch to see ID format"
                className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-cyan-400 font-mono"
              />
              {form.branch && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-xs">AUTO</span>
                  </div>
                </span>
              )}
            </div>
            {form.branch && (
              <p className="text-xs text-slate-500 mt-1">
                Final ID will be shown after employee is created
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="emp-password" className="text-sm text-slate-300">Password <span className="text-rose-400">*</span></label>
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
            <label htmlFor="emp-role" className="text-sm text-slate-300">Role <span className="text-rose-400">*</span></label>
            <select
              id="emp-role"
              name="role"
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
              required
            >
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
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
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-3 text-white font-semibold hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 transition-all"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Adding Employee...
            </>
          ) : (
            <>
              <UserPlus size={20} />
              Add Employee
            </>
          )}
        </button>
      </form>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl shadow-cyan-500/10">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                <CheckCircle size={40} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Employee Added!</h3>
              <p className="text-slate-400 mb-6">The employee has been successfully added to the system.</p>
              
              <div className="space-y-4">
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-sm text-slate-400 mb-2">Employee ID</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl font-mono font-bold text-cyan-400">{newEmployeeId}</span>
                    <button
                      onClick={() => copyToClipboard(newEmployeeId)}
                      className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
                      title="Copy to clipboard"
                    >
                      {copied ? <CheckCircle size={18} className="text-green-400" /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-sm text-slate-400 mb-2">Password</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl font-mono font-bold text-cyan-400">{newEmployeePassword}</span>
                    <button
                      onClick={() => {
                        copyToClipboard(newEmployeePassword);
                        toast.success("Password copied!");
                      }}
                      className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
                      title="Copy password"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-500">Share these credentials with the employee for login</p>
              </div>

              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setNewEmployeeId("");
                  setNewEmployeePassword("");
                }}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddEmployeeForm;
