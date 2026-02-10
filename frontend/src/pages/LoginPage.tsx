import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="p-8 max-w-sm w-full text-white">
        <h1 className="text-2xl mb-4">Login</h1>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            className="p-2 bg-gray-800 text-white border border-gray-700 rounded focus:outline-none focus:border-gray-500"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="p-2 bg-gray-800 text-white border border-gray-700 rounded focus:outline-none focus:border-gray-500"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="bg-white text-black p-2 rounded hover:bg-gray-200 transition">
            Login
          </button>
        </form>
        <p className="mt-4 text-sm text-gray-400">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-white underline hover:text-gray-300"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
