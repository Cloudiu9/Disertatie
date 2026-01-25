import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BellIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

const navItems = [
  { label: "Browse", href: "/" },
  { label: "TV Shows", href: "/tv" },
  { label: "Movies", href: "/movies" },
  { label: "New & Popular", href: "/new" },
  { label: "My List", href: "/my-list" },
];

function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  return (
    <header className="fixed top-0 z-50 w-full bg-gradient-to-b from-black/90 to-black/40 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-6">
        {/* LEFT */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link
            to="/"
            className="text-xl font-extrabold tracking-wide text-red-600"
          >
            MOVIEFLIX
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-200">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className="transition hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-5 text-gray-200">
          {/* Search */}
          <div className="relative flex items-center">
            {searchOpen && (
              <input
                autoFocus
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Titles, people, genres"
                className="mr-2 w-48 rounded bg-black/80 px-3 py-1 text-sm text-white placeholder-gray-400 outline-none ring-1 ring-gray-600 focus:ring-white transition"
              />
            )}

            <button
              onClick={() => setSearchOpen((v) => !v)}
              className="hover:text-white transition"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Notifications */}
          {/* <button className="relative hover:text-white transition">
            <BellIcon className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-600" />
          </button> */}

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-1"
            >
              <img
                src="https://i.pravatar.cc/40?img=32"
                alt="Profile"
                className="h-8 w-8 rounded"
              />
              <ChevronDownIcon className="h-4 w-4" />
            </button>

            {profileOpen && (
              <div
                className="absolute right-0 mt-2 w-48 rounded bg-black/95 py-2 text-sm shadow-lg ring-1 ring-white/10"
                onMouseLeave={() => setProfileOpen(false)}
              >
                <Link
                  to="/profile"
                  className="block px-4 py-2 hover:bg-white/10"
                >
                  Profile
                </Link>
                <Link
                  to="/settings"
                  className="block px-4 py-2 hover:bg-white/10"
                >
                  Settings
                </Link>
                <button
                  onClick={() => alert("Logged out")}
                  className="block w-full px-4 py-2 text-left hover:bg-white/10"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
