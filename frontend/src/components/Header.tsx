import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import debounce from "lodash.debounce";
import type { Movie } from "../types/Movie";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { label: "Browse", href: "/" },
  { label: "Movies", href: "/movies" },
  { label: "New & Popular", href: "/new" },
  { label: "My List", href: "/my-list" },
];

export default function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  /* outside click handling for search  */
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  /*  outside click handling for dropdown */
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  /* debounced backend search */
  const doSearch = debounce(async (q: string) => {
    if (!q) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);

    try {
      const res = await fetch(
        `http://127.0.0.1:5000/api/movies/search?q=${encodeURIComponent(q)}`,
      );
      const data: Movie[] = await res.json();
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, 300);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    doSearch(q.trim());
  };

  return (
    <header className="fixed top-0 z-50 w-full bg-[#141414] shadow-md">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-6">
        {/* LEFT */}
        <div className="flex items-center gap-10">
          <Link to="/" className="text-2xl font-black text-red-600">
            MOVIEFLIX
          </Link>

          <nav className="hidden md:flex gap-6 text-sm text-gray-300">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className={`transition hover:text-white ${
                  item.label === "My List" ? "hover:underline" : ""
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-6 text-gray-300">
          {/* SEARCH */}
          <div ref={searchRef} className="relative">
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <MagnifyingGlassIcon
                className="h-5 w-5 cursor-pointer hover:text-white"
                onClick={() => setSearchOpen(true)}
              />

              {searchOpen && (
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={onChange}
                  placeholder="Search movies..."
                  className="w-48 rounded bg-black px-3 py-1 text-sm text-white placeholder-gray-400 outline-none"
                />
              )}
            </div>

            {searchOpen && searchQuery && (
              <div className="absolute right-0 top-10 z-50 w-80 max-h-96 overflow-y-auto rounded bg-black shadow-lg ring-1 ring-white/10">
                {searchLoading && (
                  <div className="p-4 text-gray-400">Searching...</div>
                )}

                {!searchLoading &&
                  searchResults.length === 0 &&
                  searchQuery && (
                    <div className="p-4 text-gray-500">
                      No results for "{searchQuery}"
                    </div>
                  )}

                {!searchLoading &&
                  searchResults.map((movie) => (
                    <Link
                      key={movie.tmdb_id}
                      to={`/movies/${movie.tmdb_id}`}
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                      className="flex items-center gap-3 border-b border-gray-800 p-3 hover:bg-gray-800 focus:bg-gray-800"
                    >
                      <img
                        src={
                          movie.poster_path
                            ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
                            : "https://via.placeholder.com/80x120?text=No+Image"
                        }
                        alt={movie.title}
                        className="h-16 w-12 rounded object-cover"
                      />
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {movie.title}
                        </div>
                        <div className="text-xs text-gray-400">
                          {movie.year ?? ""}
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            )}
          </div>

          {/* USER DROPDOWN */}
          <div className="relative" ref={dropdownRef}>
            {user ? (
              <>
                <button
                  onClick={() => setOpen((o) => !o)}
                  className="rounded-full bg-white/20 px-4 py-2 text-sm hover:bg-white/30 transition"
                >
                  {user.email}
                </button>

                {open && (
                  <div className="absolute right-0 mt-2 w-40 rounded bg-zinc-900 border border-zinc-700 shadow-lg">
                    <Link
                      to="/profile"
                      onClick={() => setOpen(false)}
                      className="block px-4 py-2 hover:bg-zinc-700"
                    >
                      Profile
                    </Link>

                    <button
                      onClick={async () => {
                        await logout();
                        setOpen(false);
                      }}
                      className="block w-full px-4 py-2 text-left text-sm hover:bg-zinc-800"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex gap-4 text-sm">
                <Link to="/login" className="hover:text-white">
                  Login
                </Link>
                <Link to="/register" className="hover:text-white">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
