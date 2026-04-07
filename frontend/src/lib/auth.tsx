"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiFetch } from "./api";

interface User {
  id: string;
  email: string;
  display_name: string;
  role: "requester" | "annotator";
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      apiFetch("/api/auth/me")
        .then(setUser)
        .catch(() => localStorage.removeItem("token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("token", data.token);
    setUser(data.user);
  };

  const register = async (email: string, password: string, name: string, role: string) => {
    const data = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, display_name: name, role }),
    });
    localStorage.setItem("token", data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
