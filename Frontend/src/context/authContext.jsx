import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../config/axios.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");
      
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem("user");
        }
      }
      
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get(`/auth/profile`);
        setUser(res.data.user);
        localStorage.setItem("user", JSON.stringify(res.data.user));
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("avatar");
    localStorage.removeItem("user");
  }, []);

  const updateAvatar = useCallback((avatarUrl) => {
    setUser((prev) => (prev ? { ...prev, avatar: avatarUrl } : prev));
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, login, logout, updateAvatar, updateUser, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};

export default AuthProvider;
