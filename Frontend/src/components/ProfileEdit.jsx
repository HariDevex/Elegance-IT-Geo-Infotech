import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { useAuth } from "../context/authContext";
import { Eye, EyeOff } from "lucide-react";
import { getImageUrl } from "../utils/excel";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const ProfileEdit = ({ onDone }) => {
  const { user, updateAvatar } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    dob: user?.dob ? String(user.dob).slice(0, 10) : "",
    gender: user?.gender || "",
    maritalStatus: user?.maritalStatus || "",
    department: user?.department || "",
    designation: user?.designation || "",
    newPassword: "",
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleAvatarUpload = async (file) => {
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE}/api/auth/avatar`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      const url = getImageUrl(res.data?.avatarUrl) || URL.createObjectURL(file);
      updateAvatar(url);
      toast.success("Avatar updated!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Avatar upload failed");
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const updates = { ...form };
      if (!updates.newPassword) delete updates.newPassword;
      if (!updates.dob) delete updates.dob;
      
      Object.keys(updates).forEach(k => {
        if (updates[k] === "" || updates[k] === null) delete updates[k];
      });

      const res = await axios.put(`${API_BASE}/api/employees/${user._id}`, updates, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setSuccess("Profile updated!");
        toast.success("Profile updated!");
        setTimeout(() => onDone?.(), 1500);
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to update profile";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Edit Profile</h2>
        {onDone && (
          <button
            onClick={onDone}
            className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm hover:bg-slate-600"
          >
            Cancel
          </button>
        )}
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

      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 flex flex-col items-center">
        <div className="relative">
          <div className="h-32 w-32 rounded-full overflow-hidden bg-slate-700 border-4 border-slate-600">
            {(user?.avatar || user?.profileImage) ? (
              <img
                src={getImageUrl(user?.avatar || user?.profileImage)}
                alt={form.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-3xl text-white font-bold">
                {(form.name || "U").slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <label className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-indigo-600 text-white flex items-center justify-center cursor-pointer hover:bg-indigo-500">
            <span className="text-lg">📷</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleAvatarUpload(f);
              }}
            />
          </label>
        </div>
        <p className="mt-3 text-sm text-slate-400">Click camera to change avatar</p>
      </div>

      <form onSubmit={onSubmit} className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="profile-name" className="text-sm text-slate-300">Name</label>
            <input
              id="profile-name"
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="profile-email" className="text-sm text-slate-300">Email</label>
            <input
              id="profile-email"
              type="email"
              value={form.email}
              disabled
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white/50 cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="profile-department" className="text-sm text-slate-300">Department</label>
            <input
              id="profile-department"
              type="text"
              value={form.department}
              onChange={(e) => update("department", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="profile-designation" className="text-sm text-slate-300">Designation</label>
            <input
              id="profile-designation"
              type="text"
              value={form.designation}
              onChange={(e) => update("designation", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="profile-dob" className="text-sm text-slate-300">Date of Birth</label>
            <input
              id="profile-dob"
              type="date"
              value={form.dob}
              onChange={(e) => update("dob", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="profile-gender" className="text-sm text-slate-300">Gender</label>
            <select
              id="profile-gender"
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
            <label htmlFor="profile-marital" className="text-sm text-slate-300">Marital Status</label>
            <select
              id="profile-marital"
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
            <label htmlFor="profile-password" className="text-sm text-slate-300">New Password (leave blank)</label>
            <div className="relative">
              <input
                id="profile-password"
                type={showPassword ? "text" : "password"}
                value={form.newPassword}
                onChange={(e) => update("newPassword", e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 pr-10 text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-4 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
};

export default ProfileEdit;
