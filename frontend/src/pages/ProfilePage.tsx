import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchMyList } from "../api/myList";
import { useNavigate } from "react-router-dom";

type Movie = {
  tmdb_id: number;
};

function formatDate(dateString?: string | null) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString();
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [myListCount, setMyListCount] = useState<number>(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    async function fetchList() {
      if (!user) return;
      try {
        const list: Movie[] = await fetchMyList();
        setMyListCount(list.length);
      } catch {
        setMyListCount(0);
      }
    }
    fetchList();
  }, [user]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="pt-24 pb-12 px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-2">Account</h1>
            <div className="h-1 w-16 bg-red-600"></div>
          </div>

          {/* Profile Content */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Left Column - Avatar & Name */}
            <div className="md:col-span-1">
              <div className="flex flex-col items-center md:items-start">
                <div className="w-32 h-32 bg-gradient-to-br from-red-600 to-red-800 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-5xl font-bold">
                    {user.email[0].toUpperCase()}
                  </span>
                </div>
                <h2 className="text-xl font-semibold">
                  {user.email.split("@")[0]}
                </h2>
                <p className="text-gray-400 text-sm">Member</p>
              </div>
            </div>

            {/* Right Column - Details */}
            <div className="md:col-span-2 space-y-6">
              {/* Account Details Section */}
              <div className="border-b border-gray-800 pb-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-300">
                  Account Details
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-gray-400 text-sm">Email</p>
                      <p className="text-lg">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-gray-400 text-sm">Member Since</p>
                      <p className="text-lg">{formatDate(user.created_at)}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-gray-400 text-sm">Last Login</p>
                      <p className="text-lg">{formatDate(user.last_login)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* My List Stats Section */}
              <div className="border-b border-gray-800 pb-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-300">
                  Your Activity
                </h3>
                <div className="bg-zinc-900 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm mb-1">
                        Movies in My List
                      </p>
                      <p className="text-4xl font-bold">{myListCount}</p>
                    </div>
                    <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Section */}
              <div>
                <button
                  onClick={() => {
                    /* Add logout handler */
                  }}
                  className="bg-transparent border border-gray-700 text-white px-6 py-2 rounded hover:bg-gray-800 transition"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
