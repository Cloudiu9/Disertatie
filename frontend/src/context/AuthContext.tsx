import { createContext, useContext, useEffect, useState } from "react";
import * as authApi from "../api/auth";
import toast from "react-hot-toast";

type User = {
  _id: string;
  email: string;
  onboarding_complete?: boolean;
  preferred_genres?: string[];
  created_at?: string;
  last_login?: string | null;
};

type MyListItem = {
  tmdb_id: number;
  media_type: "movie" | "tv";
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  myList: MyListItem[];
  refreshMyList: () => Promise<void>;
  addLocal: (item: MyListItem) => void;
  removeLocal: (item: MyListItem) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  refreshMe: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [myList, setMyList] = useState<MyListItem[]>([]);

  function addLocal(item: MyListItem) {
    setMyList((prev) => {
      if (
        prev.some(
          (m) => m.tmdb_id === item.tmdb_id && m.media_type === item.media_type,
        )
      ) {
        return prev;
      }

      return [...prev, item];
    });
  }

  function removeLocal(item: MyListItem) {
    setMyList((prev) =>
      prev.filter(
        (m) =>
          !(m.tmdb_id === item.tmdb_id && m.media_type === item.media_type),
      ),
    );
  }

  async function refreshMe() {
    setLoading(true);

    const me = await authApi.getMe();

    setUser(me);

    setLoading(false);

    if (
      me &&
      !me.onboarding_complete &&
      window.location.pathname !== "/onboarding"
    ) {
      window.location.href = "/onboarding";
    }
  }

  async function refreshMyList() {
    if (!user) {
      setMyList([]);
      return;
    }

    const res = await fetch("/api/my-list", {
      credentials: "include",
    });

    const data = await res.json();

    setMyList(
      data.map((item: any) => ({
        tmdb_id: item.tmdb_id,
        media_type: item.media_type,
      })),
    );
  }

  async function login(email: string, password: string) {
    try {
      await authApi.login(email, password);
      await refreshMe();
      await refreshMyList();
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
    setMyList([]);
    toast.success("Logged out");
  }

  useEffect(() => {
    async function init() {
      await refreshMe();
    }

    init();
  }, []);

  useEffect(() => {
    if (user) {
      refreshMyList();
    } else {
      setMyList([]);
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        myList,
        refreshMyList,
        addLocal,
        removeLocal,
        login,
        register,
        refreshMe,
        logout,
      }}
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
