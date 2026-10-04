import { useCallback, useEffect, useState } from "react";
import * as authApi from "../api/auth";
import toast from "react-hot-toast";
import { AuthContext, type MyListItem, type User } from "./auth-context";

type RawMyListItem = {
  tmdb_id: number;
  media_type: "movie" | "tv";
};

function getErrorMessage(err: unknown, fallback: string): string {
  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof (err as { response?: { data?: { error?: string } } }).response?.data
      ?.error === "string"
  ) {
    return (err as { response: { data: { error: string } } }).response.data
      .error;
  }
  return fallback;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [myList, setMyList] = useState<MyListItem[]>([]);

  const addLocal = useCallback((item: MyListItem) => {
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
  }, []);

  const removeLocal = useCallback((item: MyListItem) => {
    setMyList((prev) =>
      prev.filter(
        (m) =>
          !(m.tmdb_id === item.tmdb_id && m.media_type === item.media_type),
      ),
    );
  }, []);

  const refreshMe = useCallback(async () => {
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
  }, []);

  const refreshMyList = useCallback(async () => {
    if (!user) {
      setMyList([]);
      return;
    }

    const res = await fetch("/api/my-list", { credentials: "include" });
    const data: RawMyListItem[] = await res.json();

    setMyList(
      data.map((item) => ({
        tmdb_id: item.tmdb_id,
        media_type: item.media_type,
      })),
    );
  }, [user]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        await authApi.login(email, password);
        await refreshMe();
        await refreshMyList();
        toast.success("Logged in successfully");
      } catch (err: unknown) {
        toast.error(getErrorMessage(err, "Login failed"));
        throw err;
      }
    },
    [refreshMe, refreshMyList],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      try {
        await authApi.register(email, password);
        await login(email, password);
        toast.success("Account created successfully");
      } catch (err: unknown) {
        toast.error(getErrorMessage(err, "Registration failed"));
        throw err;
      }
    },
    [login],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setMyList([]);
    toast.success("Logged out");
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refreshMyList();
    } else {
      setMyList([]);
    }
  }, [user, refreshMyList]);

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
