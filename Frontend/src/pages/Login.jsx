import { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";
import logoSrc from "../assets/Logo/EG.png";
import { useAuth } from "../context/authContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const VideoBackground = lazy(() => import("../components/VideoBackground"));

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, {
        email,
        password,
      });

      if (res.data.success) {
        localStorage.setItem("token", res.data.token);
        const userData = res.data.user;
        
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
      setError(err.response?.data?.error || "Login failed");
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
        <div className="text-center mb-8">
          <img
            src={logoSrc}
            alt="Elegance Logo"
            className="h-20 w-20 mx-auto mb-4 object-contain"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <h1 className="text-2xl font-bold text-white">Elegance IT & Geo Synergy</h1>
          <p className="text-slate-400 mt-1">Welcome Back</p>
        </div>

        <div className="bg-black/10 backdrop-blur-xl rounded-3xl border border-2 border-black/90 p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white text-center mb-6">Sign In</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-200 mb-2">Email</label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 backdrop-blur-sm"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-200 mb-2">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 pr-12 backdrop-blur-sm"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-200 hover:text-cyan-300 transition"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <a href="/Forgot-Password" className="text-cyan-400 hover:text-cyan-300 transition">
              Forgot Password?
            </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold transition disabled:opacity-50 hover:shadow-lg hover:shadow-cyan-500/30"
              style={{ 
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                color: '#000000'
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
