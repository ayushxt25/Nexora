import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Users2, LayoutDashboard, Sparkles, Search, History, MessageSquareHeart, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/generate", label: "Generate", icon: Sparkles },
  { to: "/fact-check", label: "Fact Check", icon: Search },
  { to: "/history", label: "History", icon: History },
  { to: "/feedback-history", label: "Feedback", icon: MessageSquareHeart },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { username, logout } = useAuth();

  return (
    <>
      <nav className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-secondary flex items-center justify-center">
                <Users2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white hidden sm:block">
                Networking<span className="gradient-text">Assistant</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navItems.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === to
                      ? "bg-accent/15 text-accent"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <span className="text-sm text-white/50">{username}</span>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>

            <button
              className="md:hidden p-2 text-white/70"
              onClick={() => setOpen(!open)}
            >
              {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden glass border-t border-white/5 px-4 py-3 space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  location.pathname === to
                    ? "bg-accent/15 text-accent"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            <button
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </nav>
    </>
  );
}