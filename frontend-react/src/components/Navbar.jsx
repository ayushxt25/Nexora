import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu, X, Users2, LayoutDashboard, Sparkles, Search, History,
  MessageSquareHeart, LogOut, ListChecks, CalendarDays, ChevronDown, Lightbulb, Target, BarChart3, TrendingUp, Network, Activity, ScrollText, Radar, BrainCircuit, UserCircle2, Settings, Palette, CircleHelp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";

const navGroups = [
  {
    label: "Command Center",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/follow-ups", label: "Follow-ups", icon: ListChecks },
      { to: "/recommendations", label: "Recommendations", icon: Lightbulb },
      { to: "/opportunities", label: "Opportunities", icon: Target },
    ],
  },
  {
    label: "Relationships",
    items: [
      { to: "/contacts", label: "Contacts", icon: Users2 },
      { to: "/events", label: "Events", icon: CalendarDays },
    ],
  },
  {
    label: "Prep",
    items: [
      { to: "/generate", label: "Generate", icon: Sparkles },
      { to: "/fact-check", label: "Fact Check", icon: Search },
    ],
  },
  {
    label: "Insights",
    items: [
      { to: "/relationship-scores", label: "Relationship Scores", icon: TrendingUp },
      { to: "/network-graph", label: "Network Graph", icon: Network },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/history", label: "History", icon: History },
      { to: "/feedback-history", label: "Feedback", icon: MessageSquareHeart },
    ],
  },
];

const developerConsoleItems = [
  { to: "/developer/metrics", label: "Metrics", icon: Activity },
  { to: "/developer/audit-logs", label: "Audit Logs", icon: ScrollText },
  { to: "/developer/retrieval-debug", label: "Retrieval Debug", icon: Radar },
  { to: "/developer/ranker-tools", label: "Ranker Tools", icon: BrainCircuit },
];

const accountItems = [
  { label: "Profile", icon: UserCircle2, to: "/profile" },
  { label: "Settings", icon: Settings, to: "/settings" },
  { label: "Help", icon: CircleHelp, to: "/help" },
];

function NavDropdown({ group, isActive }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? group.tone === "developer"
              ? "bg-amber-500/15 text-amber-300"
              : "bg-accent/15 text-accent"
            : group.tone === "developer"
              ? "text-amber-200/75 hover:text-amber-100 hover:bg-amber-500/10 border border-amber-500/15"
              : "text-white/60 hover:text-white hover:bg-white/5"
        }`}
      >
        {group.label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1 glass rounded-lg py-1.5 min-w-[180px] z-50"
          >
            {group.items.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                  group.tone === "developer"
                    ? "text-amber-100/75 hover:text-amber-50 hover:bg-amber-500/10"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserMenu({ username, isAdmin, onLogout, mobile = false, onClose }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (mobile) return undefined;
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobile]);

  const activeDeveloperRoute = developerConsoleItems.some((item) => window.location.pathname === item.to);

  if (mobile) {
    return (
      <div className="space-y-2">
        <div className="px-3">
          <p className="text-xs font-medium text-white/40 uppercase tracking-wide mb-2">Account</p>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <p className="text-sm font-medium text-white">{username || "User"}</p>
            <p className="mt-1 text-xs text-white/40">Workspace menu</p>
          </div>
        </div>

        <div className="space-y-1">
          {accountItems.map(({ label, icon: Icon, to }) => (
            <Link
              key={label}
              to={to}
              onClick={onClose}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </div>

        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
          <div className="flex items-center gap-3 text-white/45">
            <Palette className="w-4 h-4" />
            <div>
              <p className="text-sm font-medium text-white/60">Theme</p>
              <p className="mt-1 text-xs text-white/40">Not yet available</p>
            </div>
          </div>
        </div>

        {isAdmin ? (
          <div className="pt-2 border-t border-amber-500/10">
            <p className="text-xs font-medium text-amber-200/70 uppercase tracking-wide px-3 mb-1">
              Developer Console
            </p>
            <div className="space-y-1">
              {developerConsoleItems.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-100/75 hover:text-amber-50 hover:bg-amber-500/10"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all duration-200 ${
          open || activeDeveloperRoute
            ? "border-white/12 bg-white/10 text-white shadow-[0_12px_30px_rgba(10,14,24,0.28)]"
            : "border-transparent text-white/60 hover:text-white hover:bg-white/5 hover:border-white/10"
        }`}
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-white/6">
          <UserCircle2 className="h-4 w-4" />
        </span>
        <span className="max-w-[140px] truncate text-left font-medium">{username || "User"}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.985 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 top-full mt-3 w-[320px] overflow-hidden rounded-3xl border border-white/12 bg-[rgba(10,14,24,0.92)] p-2.5 shadow-[0_28px_90px_rgba(2,6,23,0.68)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[rgba(10,14,24,0.8)] z-[90]"
          >
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.03]">
                  <UserCircle2 className="h-5 w-5 text-white/75" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{username || "User"}</p>
                  <p className="mt-1 text-xs text-white/45">Account menu</p>
                </div>
              </div>
            </div>

            <div className="mt-2 space-y-1">
              {accountItems.map(({ label, icon: Icon, to }) => (
                <Link
                  key={label}
                  to={to}
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04]">
                    <Icon className="w-4 h-4" />
                  </span>
                  {label}
                </Link>
              ))}
            </div>

            <div className="mt-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-3">
              <div className="flex items-center gap-3 text-white/60">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04]">
                  <Palette className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-sm">Theme</p>
                  <p className="mt-1 text-xs text-white/40">Not yet available</p>
                </div>
              </div>
            </div>

            {isAdmin ? (
              <div className="mt-2 border-t border-white/8 pt-3">
                <p className="px-3.5 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200/70">
                  Developer Console
                </p>
                <div className="space-y-1">
                  {developerConsoleItems.map(({ to, label, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm text-amber-100/80 transition-colors hover:bg-amber-500/12 hover:text-amber-50"
                    >
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-amber-500/15 bg-amber-500/10">
                        <Icon className="w-4 h-4" />
                      </span>
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-2 border-t border-white/8 pt-3">
              <button
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-red-500/15 bg-red-500/10">
                  <LogOut className="w-4 h-4" />
                </span>
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { username, logout } = useAuth();
  // TODO: Replace this temporary username-based admin check with `user.role === "admin"`
  // once Supabase auth and real backend role claims are available.
  const isAdmin = username === "ayush2522";

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
              {navGroups.map((group) => (
                <NavDropdown
                  key={group.label}
                  group={group}
                  isActive={group.items.some((i) => i.to === location.pathname)}
                />
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <UserMenu username={username} isAdmin={isAdmin} onLogout={logout} />
            </div>

            <button
              className="md:hidden p-2 text-white/70"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden glass border-t border-white/5 px-4 py-3 space-y-4">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-medium text-white/40 uppercase tracking-wide px-3 mb-1">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map(({ to, label, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                        location.pathname === to
                          ? group.tone === "developer"
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-accent/15 text-accent"
                          : group.tone === "developer"
                            ? "text-amber-100/75 hover:text-amber-50 hover:bg-amber-500/10"
                            : "text-white/60 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <UserMenu
              mobile
              username={username}
              isAdmin={isAdmin}
              onClose={() => setMobileOpen(false)}
              onLogout={() => {
                setMobileOpen(false);
                logout();
              }}
            />
          </div>
        )}
      </nav>
    </>
  );
}
