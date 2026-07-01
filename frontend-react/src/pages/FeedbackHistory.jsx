import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageSquareHeart, ThumbsUp, ThumbsDown, Calendar } from "lucide-react";
import { api } from "../api/client";
import GlassCard from "../components/GlassCard";
import LoadingSpinner from "../components/LoadingSpinner";

export default function FeedbackHistory() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getFeedbackHistory()
      .then((data) => setEntries(data || []))
      .catch((err) => setError(err.message || "Couldn't load feedback history."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-1">
        <MessageSquareHeart className="w-6 h-6 text-accent-secondary" />
        <h1 className="text-3xl font-bold text-white">Recent Feedback</h1>
      </div>
      <p className="text-white/50 mb-8">Suggestions you've rated, most recent first.</p>

      {loading && <LoadingSpinner label="Loading your feedback..." />}

      {!loading && error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <GlassCard className="text-center py-12">
          <p className="text-white/40">No feedback submitted yet.</p>
        </GlassCard>
      )}

      {!loading && entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((entry, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass rounded-xl p-4 flex items-start gap-3"
            >
              {entry.action === "like" ? (
                <ThumbsUp className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <ThumbsDown className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-sm text-white/80">{entry.suggestion}</p>
                {entry.created_at && (
                  <span className="flex items-center gap-1 text-xs text-white/30 mt-1.5">
                    <Calendar className="w-3 h-3" />
                    {entry.created_at}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}