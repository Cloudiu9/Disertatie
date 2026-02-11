import { createContext, useContext, useEffect, useState } from "react";
import * as authApi from "../api/auth";
import toast from "react-hot-toast";

type User = {
  _id: string;
  email: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  refreshMe: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshMe() {
    setLoading(true);
    const me = await authApi.getMe();
    setUser(me);
    setLoading(false);
  }

  async function login(email: string, password: string) {
    try {
      await authApi.login(email, password);
      await refreshMe();
      toast.success("Logged in successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Login failed");
      throw err;
    }
  }

  async function register(email: string, password: string) {
    try {
      await authApi.register(email, password);
      await login(email, password);
      toast.success("Account created successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Registration failed");
      throw err;
    }
  }

  async function logout() {
    await authApi.logout();
    setUser(null);
    toast.success("Logged out");
  }

  useEffect(() => {
    refreshMe();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, refreshMe, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
