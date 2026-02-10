const API_BASE = "http://127.0.0.1:5000/api/auth";

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Login failed");
  }

  return res.json();
}

export async function register(email: string, password: string) {
  const res = await fetch(`${API_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Register failed");
  }

  return res.json();
}

export async function getMe() {
  const res = await fetch(`${API_BASE}/me`, {
    credentials: "include",
  });

  if (!res.ok) return null;
  return res.json();
}

export async function logout() {
  // optional for now
}
