import React, { createContext, useContext, useState, useEffect } from "react";
import { http } from "../lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("lc_user");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("lc_token");
      if (token) {
        try {
          const res = await http.get("/auth/me");
          setUser(res.data);
          localStorage.setItem("lc_user", JSON.stringify(res.data));
        } catch (err) {
          console.error("Auth check failed", err);
          localStorage.removeItem("lc_token");
          localStorage.removeItem("lc_user");
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await http.post("/auth/login", { email, password });
    const { access_token, user: userData } = res.data;
    localStorage.setItem("lc_token", access_token);
    localStorage.setItem("lc_user", JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem("lc_token");
    localStorage.removeItem("lc_user");
    setUser(null);
  };

  const updateAvatar = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await http.post("/auth/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const newAvatarUrl = res.data.avatar_url;
    const updatedUser = { ...user, avatar_url: newAvatarUrl };
    setUser(updatedUser);
    localStorage.setItem("lc_user", JSON.stringify(updatedUser));
    return newAvatarUrl;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateAvatar, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
