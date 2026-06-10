import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import debounce from "lodash.debounce";
import type { Movie } from "../types/Movie";
import { useAuth } from "../context/AuthContext";

type SearchItem = Movie & {
  media_type?: "movie" | "tv";
};

const navItems = [
  { label: "Movies", href: "/" },
  { label: "TV Shows", href: "/tv" },
  { label: "My List", href: "/my-list" },
];

export default function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setSearchOpen(false);
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const doSearch = debounce(async (q: string) => {
    if (!q) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);

    try {
      const [moviesRes, tvRes] = await Promise.all([
        fetch(`/api/movies/search?q=${encodeURIComponent(q)}`),
        fetch(`/api/tv/search?q=${encodeURIComponent(q)}`),
      ]);

      const movies: SearchItem[] = await moviesRes.json();
      const tv: SearchItem[] = await tvRes.json();

      const taggedMovies = movies.map(
        (m): SearchItem => ({ ...m, media_type: "movie" }),
      );
      const taggedTV = tv.map((t): SearchItem => ({ ...t, media_type: "tv" }));

      setSearchResults([...taggedMovies, ...taggedTV]);
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
      {/* ── Main bar ── */}
      <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6">
        {/* Left: logo + desktop nav */}
        <div className="flex min-w-0 items-center gap-8">
          <Link to="/" className="shrink-0 text-2xl font-black text-red-600">
            MOVIEFLIX
          </Link>

          <nav className="hidden md:flex gap-6 text-sm text-gray-300">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className="whitespace-nowrap transition hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: search + desktop user area + mobile hamburger */}
        <div className="flex shrink-0 items-center gap-4 text-gray-300">
          {/* Search */}
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
                  placeholder="Search movies or TV..."
                  className="w-36 sm:w-48 rounded bg-black px-3 py-1 text-sm text-white placeholder-gray-400 outline-none"
                />
              )}
            </div>

            {searchOpen && searchQuery && (
              <div className="absolute right-0 top-10 z-50 w-72 sm:w-80 max-h-96 overflow-y-auto rounded bg-black shadow-lg ring-1 ring-white/10">
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
                  searchResults.map((item) => {
                    const url =
                      item.media_type === "tv"
                        ? `/tv/${item.tmdb_id}`
                        : `/movies/${item.tmdb_id}`;

                    return (
                      <Link
                        key={`${item.media_type}-${item.tmdb_id}`}
                        to={url}
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                        className="flex items-center gap-3 border-b border-gray-800 p-3 hover:bg-gray-800"
                      >
                        <img
                          src={
                            item.poster_path
                              ? `https://image.tmdb.org/t/p/w200${item.poster_path}`
                              : "https://via.placeholder.com/80x120"
                          }
                          alt={item.title}
                          className="h-16 w-12 rounded object-cover"
                        />

                        <div>
                          <div className="text-sm font-semibold text-white">
                            {item.title}
                          </div>

                          <div className="text-xs text-gray-400">
                            {item.year ?? ""}
                            {" • "}
                            {item.media_type === "tv" ? "TV" : "Movie"}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Desktop user area — hidden on mobile */}
          <div className="relative hidden md:block" ref={dropdownRef}>
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
                      className="block px-4 py-2 text-sm hover:bg-zinc-700"
                    >
                      Profile
                    </Link>

                    <button
                      onClick={async () => {
                        await logout();
                        setOpen(false);
                      }}
                      className="block w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 cursor-pointer"
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

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden p-1 text-gray-300 hover:text-white transition"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile slide-down menu ── */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-800 bg-[#141414] px-4 py-3 flex flex-col">
          {/* Nav links */}
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              onClick={() => setMenuOpen(false)}
              className="block rounded px-2 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition"
            >
              {item.label}
            </Link>
          ))}

          {/* Divider + user section */}
          <div className="mt-2 border-t border-gray-800 pt-3">
            {user ? (
              <>
                <p className="truncate px-2 pb-2 text-xs text-gray-500">
                  {user.email}
                </p>

                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded px-2 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition"
                >
                  Profile
                </Link>

                <button
                  onClick={async () => {
                    await logout();
                    setMenuOpen(false);
                  }}
                  className="block w-full rounded px-2 py-3 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition cursor-pointer"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex gap-6 px-2 py-2">
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="text-sm text-gray-300 hover:text-white transition"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className="text-sm text-gray-300 hover:text-white transition"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
