import React, { useState, lazy, Suspense, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../config/axios.js";
import { Eye, EyeOff, Shield, Lock, User, Loader2 } from "lucide-react";
import logoSrc from "../assets/Logo/EG.png";
import { useAuth } from "../context/authContext";


const VideoBackground = lazy(() => import("../components/VideoBackground"));

const PasswordStrengthIndicator = ({ password }) => {
  const getStrength = (pwd) => {
    if (!pwd) return { score: 0, label: "", color: "" };
    
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score++;
    
    if (score <= 1) return { score: 1, label: "Weak", color: "bg-rose-500" };
    if (score <= 2) return { score: 2, label: "Fair", color: "bg-amber-500" };
    if (score <= 3) return { score: 3, label: "Good", color: "bg-emerald-500" };
    return { score: 4, label: "Strong", color: "bg-cyan-500" };
  };

  const strength = getStrength(password);

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              strength.score >= level ? strength.color : "bg-slate-700"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs ${strength.color.replace("bg-", "text-")}`}>
        Password strength: {strength.label}
      </p>
    </div>
  );
};

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [lastLogin, setLastLogin] = useState(null);

  useEffect(() => {
    const savedEmployeeId = localStorage.getItem("rememberedEmployeeId");
    if (savedEmployeeId) {
      setEmployeeId(savedEmployeeId);
      setRememberMe(true);
    }
    const lastLoginTime = localStorage.getItem("lastLogin");
    if (lastLoginTime) {
      setLastLogin(new Date(parseInt(lastLoginTime)).toLocaleString());
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = employeeId.trim();
    if (!trimmedEmail) {
      setError("Email is required");
      return;
    }
    const emailRegex = /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Invalid email");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post(`/auth/login`, {
        employee_id: trimmedEmail,
        password,
        rememberMe,
      });

      if (res.data.success) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("lastLogin", Date.now().toString());
        
        if (rememberMe) {
          localStorage.setItem("rememberedEmployeeId", employeeId.trim());
        } else {
          localStorage.removeItem("rememberedEmployeeId");
        }

        const userData = res.data.user;
        
        if (res.data.mustChangePassword) {
          navigate("/change-password", { state: { mustChange: true } });
          return;
        }
        
        if (res.data.passwordExpiring) {
          localStorage.setItem("passwordExpiring", "true");
        }

        if (!userData) {
          setError("Invalid response from server");
          setLoading(false);
          return;
        }
        
        login(userData);

        if (userData.role === "root") {
          navigate("/root-dashboard");
        } else if (["admin", "manager", "teamlead", "hr"].includes(userData.role)) {
          navigate("/admin-dashboard");
        } else {
          navigate("/employee-dashboard");
        }
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Login failed";
      setError(errorMsg);
      
      if (err.response?.data?.lockedUntil) {
        const lockedUntil = new Date(err.response.data.lockedUntil);
        const minutes = Math.ceil((lockedUntil - Date.now()) / 60000);
        setError(`Account locked. Try again in ${minutes} minutes.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      <Suspense fallback={<div className="absolute inset-0 bg-slate-900" />}>
        <VideoBackground />
      </Suspense>
      <div className="absolute inset-0 bg-black/30"></div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <img
            src={logoSrc}
            alt="Elegance Logo"
            className="h-20 w-20 mx-auto mb-4 object-contain"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <h1 className="text-2xl font-bold text-white">Elegance IT & Geo Synergy</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Shield size={16} className="text-cyan-400" />
            <p className="text-slate-400 text-sm">Welcome Back</p>
          </div>
        </div>

        <div className="bg-black/10 backdrop-blur-xl rounded-3xl border border-2 border-black/90 p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center p-2 rounded-lg bg-cyan-500/20 mb-3">
              <Lock size={20} className="text-cyan-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Sign In</h2>
            <p className="text-slate-400 text-xs mt-1">Enter your credentials to access</p>
          </div>

          {error && (
            <div 
              className="mb-4 p-3 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-400 text-sm flex items-center gap-2" 
              role="alert"
              aria-live="assertive"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              {error}
            </div>
          )}

          {lastLogin && (
            <div className="mb-4 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <User size={14} />
              Last login: {lastLogin}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label htmlFor="login-employee-id" className="block text-sm font-medium text-slate-200 mb-2">
                Employee ID
              </label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-employee-id"
                  name="employeeId"
                  type="text"
                  autoComplete="username"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 backdrop-blur-sm"
                  placeholder="Email"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-200 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 backdrop-blur-sm"
                  placeholder="Password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-200 hover:text-cyan-300 transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <PasswordStrengthIndicator password={password} />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-cyan-500 focus:ring-cyan-400"
                />
                <span className="text-slate-300">Remember me</span>
              </label>
              <a 
                href="/Forgot-Password" 
                className="text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1"
              >
                <Lock size={14} />
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold transition disabled:opacity-50 hover:shadow-lg hover:shadow-cyan-500/30 flex items-center justify-center gap-2"
              style={{ 
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                color: '#000000'
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Shield size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-700/50">
            <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
              {/* <span>🔒 256-bit encryption</span>
              <span>•</span>
              <span>Secure connection</span> */}
            </div>
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs mt-4">
          © {new Date().getFullYear()} Elegance IT & Geo Synergy. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
