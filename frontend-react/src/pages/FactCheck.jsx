import { useState } from "react";
import { motion } from "framer-motion";
import { Search, AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "../api/client";
import GlassCard from "../components/GlassCard";
import Button from "../components/Button";
import LoadingSpinner from "../components/LoadingSpinner";

export default function FactCheck() {
  const [query, setQuery] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCheck(e) {
    e.preventDefault();
    setError("");
    setSummary("");
    if (!query.trim()) {
      setError("Please enter a topic to check.");
      return;
    }
    setLoading(true);
    try {
      const data = await api.factCheck(query);
      setSummary(data.summary);
    } catch (err) {
      if (err.status === 429) {
        setError("Too many fact-checks in a row. Please wait a moment and try again.");
      } else {
        setError(err.message || "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-1">
        <Search className="w-6 h-6 text-accent-secondary" />
        <h1 className="text-3xl font-bold text-white">Quick Fact Check</h1>
      </div>
      <p className="text-white/50 mb-8">Verify a topic against Wikipedia before bringing it up.</p>

      <GlassCard className="mb-6">
        <form onSubmit={handleCheck} className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Topic to verify</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. blockchain in healthcare"
              className="w-full bg-bg-secondary border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-accent-secondary/50 focus:ring-1 focus:ring-accent-secondary/50"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} icon={Search}>
            Check Fact
          </Button>
        </form>
      </GlassCard>

      {loading && <LoadingSpinner label="Looking this up on Wikipedia..." />}

      {!loading && summary && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 border border-emerald-500/20"
        >
          <div className="flex items-center gap-2 mb-3 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="font-semibold">Summary</h3>
          </div>
          <p className="text-white/80 text-sm leading-relaxed">{summary}</p>
        </motion.div>
      )}
    </div>
  );
}