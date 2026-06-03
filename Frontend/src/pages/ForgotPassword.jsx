import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../config/axios";

const ForgotPassword = () => {
  const [employeeId, setEmployeeId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await api.post("/auth/forgot-password", {
        employee_id: employeeId,
      });

      if (response.data.success) {
        setMessage(response.data.message);
        toast.success("Request sent!");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send request");
      toast.error("Failed to send request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700 p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white text-center mb-2">
            Reset Password
          </h2>
          <p className="text-slate-400 text-center text-sm mb-6">
            Enter your Employee ID and we'll send you a reset link
          </p>

          {message && (
            <div className="mb-4 p-3 rounded-lg bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 text-sm">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="fp-employee-id" className="block text-sm font-medium text-slate-300 mb-2">
                Employee ID
              </label>
              <input
                id="fp-employee-id"
                name="employeeId"
                type="text"
                autoComplete="username"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="EJB2026001"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Request"}
            </button>
          </form>

          <p className="text-center text-slate-400 text-sm mt-6">
            Remember your password?{" "}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
