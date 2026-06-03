import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import api from "../config/axios";
import { Eye, EyeOff, RefreshCw, History, Search, Lock } from "lucide-react";
import { Skeleton } from "./Skeleton";

const PasswordResetManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/employees", { params: { limit: 100 } });
      setUsers(res.data.users || []);
    } catch (err) {
      console.error("Failed to load users:", err);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get("/auth/all-password-history");
      setHistory(res.data.history || []);
    } catch (err) {
      console.error("Failed to load password history:", err);
      toast.error("Failed to load password history");
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) {
      toast.error("Please select a user and enter a new password");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setResetting(true);
    try {
      const res = await api.post("/auth/reset-user-password", { userId: selectedUser._id, newPassword });

      if (res.data.success) {
        toast.success(`Password reset for ${selectedUser.name}!`);
        setNewPassword("");
        setSelectedUser(null);
        fetchHistory();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to reset password");
    } finally {
      setResetting(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Password Reset Manager</h2>
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Password Reset Manager</h2>
        <button
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory) fetchHistory();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-white text-sm hover:bg-slate-600"
        >
          <History size={16} />
          {showHistory ? "Hide History" : "View History"}
        </button>
      </div>

      {showHistory && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Password Reset History</h3>
          {history.length === 0 ? (
            <p className="text-slate-400 text-center py-4">No password resets recorded yet</p>
          ) : (
            <div className="space-y-2">
              {history.map((h, idx) => (
                <div key={h._id ?? idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50">
                  <div>
                    <p className="text-white font-medium">{h.user?.name}</p>
                    <p className="text-slate-400 text-sm">{h.user?.email} ({h.user?.employeeId})</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-300 text-sm">Reset by: {h.resetBy}</p>
                    <p className="text-slate-500 text-xs">
                      {new Date(h.changedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Select User</h3>
          <div className="relative mb-4">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or employee ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
            />
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {filteredUsers.map((user, idx) => (
              <div
                key={user._id ?? idx}
                onClick={() => setSelectedUser(user)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedUser?._id === user._id
                    ? "bg-indigo-600/30 border border-indigo-500"
                    : "bg-slate-900/50 hover:bg-slate-900 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-semibold">
                    {user.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-medium">{user.name}</p>
                    <p className="text-slate-400 text-sm">{user.email} ({user.employeeId})</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Reset Password</h3>
          {selectedUser ? (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">{selectedUser.name}</p>
                <p className="text-slate-400 text-sm">{selectedUser.email}</p>
                <p className="text-slate-500 text-xs">ID: {selectedUser.employeeId}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-300">New Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 chars)"
                    className="w-full pl-10 pr-10 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
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

              <button
                onClick={handleResetPassword}
                disabled={resetting || !newPassword}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold"
              >
                <RefreshCw size={18} className={resetting ? "animate-spin" : ""} />
                {resetting ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Lock size={32} className="mx-auto mb-2 opacity-50" />
              <p>Select a user to reset their password</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasswordResetManager;
