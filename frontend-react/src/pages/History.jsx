import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { History as HistoryIcon, Calendar, Tag, MessageSquare } from "lucide-react";
import { api } from "../api/client";
import GlassCard from "../components/GlassCard";
import LoadingSpinner from "../components/LoadingSpinner";

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getHistory()
      .then((data) => setHistory(data || []))
      .catch((err) => setError(err.message || "Couldn't load history."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-1">
        <HistoryIcon className="w-6 h-6 text-accent" />
        <h1 className="text-3xl font-bold text-white">Conversation History</h1>
      </div>
      <p className="text-white/50 mb-8">Everything you've generated, most recent first.</p>

      {loading && <LoadingSpinner label="Loading your history..." />}

      {!loading && error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {!loading && !error && history.length === 0 && (
        <GlassCard className="text-center py-12">
          <p className="text-white/40">No conversations generated yet.</p>
        </GlassCard>
      )}

      {!loading && history.length > 0 && (
        <div className="space-y-4">
          {history.map((entry, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <h3 className="font-semibold text-white text-sm">{entry.description}</h3>
                {entry.created_at && (
                  <span className="flex items-center gap-1 text-xs text-white/40 flex-shrink-0">
                    <Calendar className="w-3 h-3" />
                    {entry.created_at}
                  </span>
                )}
              </div>

              {entry.interests?.length > 0 && (
                <p className="text-xs text-white/50 mb-2">
                  <span className="text-white/30">Interests:</span> {entry.interests.join(", ")}
                </p>
              )}

              {entry.themes?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {entry.themes.map((t) => (
                    <span
                      key={t}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent"
                    >
                      <Tag className="w-3 h-3" />
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {entry.suggestions?.length > 0 && (
                <div className="space-y-1.5 mt-3 pt-3 border-t border-white/5">
                  {entry.suggestions.map((s, idx) => (
                    <p key={idx} className="text-xs text-white/60 flex items-start gap-2">
                      <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0 text-white/30" />
                      {s}
                    </p>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}