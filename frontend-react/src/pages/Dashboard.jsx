import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, TrendingUp, TrendingDown, Clock, Activity, Sparkles, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import GlassCard from "../components/GlassCard";
import { api } from "../api/client";

// Mock dashboard metrics since the backend doesn't expose a dedicated
// /dashboard-stats endpoint yet. Once it does, swap this for a real fetch.
const mockStats = {
  totalContacts: 142,
  strongConnections: 38,
  weakConnections: 27,
  pendingFollowUps: 9,
  healthScore: 76,
};

export default function Dashboard() {
  const { username } = useAuth();
  const [recentCount, setRecentCount] = useState(null);

  useEffect(() => {
    api
      .getHistory()
      .then((h) => setRecentCount(h.length))
      .catch(() => setRecentCount(null));
  }, []);

  const stats = [
    { label: "Total Contacts", value: mockStats.totalContacts, icon: Users, color: "text-accent" },
    { label: "Strong Connections", value: mockStats.strongConnections, icon: TrendingUp, color: "text-emerald-400" },
    { label: "Weak Connections", value: mockStats.weakConnections, icon: TrendingDown, color: "text-amber-400" },
    { label: "Pending Follow-ups", value: mockStats.pendingFollowUps, icon: Clock, color: "text-accent-secondary" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-1">
          Welcome back, <span className="gradient-text">{username}</span>
        </h1>
        <p className="text-white/50 mb-8">Here's a snapshot of your networking activity.</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => (
          <GlassCard key={s.label} delay={i * 0.05} hover>
            <s.icon className={`w-5 h-5 mb-3 ${s.color}`} />
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-white/50 mt-1">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <GlassCard className="lg:col-span-2" delay={0.2}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Network Health Score</h3>
            <Activity className="w-4 h-4 text-accent" />
          </div>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold gradient-text">{mockStats.healthScore}</span>
            <span className="text-white/40 text-sm mb-1.5">/ 100</span>
          </div>
          <div className="w-full h-2 bg-white/5 rounded-full mt-4 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${mockStats.healthScore}%` }}
              transition={{ duration: 1, delay: 0.3 }}
              className="h-full bg-gradient-to-r from-accent to-accent-secondary rounded-full"
            />
          </div>
          <p className="text-xs text-white/40 mt-3">
            Your network is healthy overall. Strengthening weak connections could push this score higher.
          </p>
        </GlassCard>

        <GlassCard delay={0.25}>
          <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link
              to="/generate"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-white/80 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-accent" />
              Generate conversation starters
            </Link>
            <Link
              to="/fact-check"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-white/80 transition-colors"
            >
              <Search className="w-4 h-4 text-accent-secondary" />
              Quick fact check
            </Link>
          </div>
          {recentCount !== null && (
            <p className="text-xs text-white/40 mt-4">
              You have {recentCount} saved {recentCount === 1 ? "conversation" : "conversations"} in your history.
            </p>
          )}
        </GlassCard>
      </div>

      <p className="text-xs text-white/30 text-center">
        Contact metrics above are illustrative mock data — connect a contacts backend to make these live.
      </p>
    </div>
  );
}