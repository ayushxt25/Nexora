import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ThumbsUp, ThumbsDown, AlertCircle, Tag } from "lucide-react";
import { api } from "../api/client";
import GlassCard from "../components/GlassCard";
import Button from "../components/Button";
import LoadingSpinner from "../components/LoadingSpinner";

const examplePrompts = [
  { description: "AI for Sustainable Cities conference", interests: "climate change, urban planning" },
  { description: "Fintech and blockchain meetup", interests: "payments, decentralization" },
  { description: "Healthcare innovation summit", interests: "telemedicine, biotech" },
];

export default function Generate() {
  const [description, setDescription] = useState("");
  const [interests, setInterests] = useState("");
  const [themes, setThemes] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [feedbackGiven, setFeedbackGiven] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate(e) {
    e?.preventDefault();
    setError("");
    if (!description.trim() || !interests.trim()) {
      setError("Please fill in both the event description and your interests.");
      return;
    }
    const interestsList = interests
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean);

    setLoading(true);
    setSuggestions([]);
    setThemes([]);
    setFeedbackGiven({});
    try {
      const data = await api.generateConversation(description, interestsList);
      setThemes(data.themes || []);
      setSuggestions(data.suggestions || []);
    } catch (err) {
      if (err.status === 429) {
        setError("You're generating too quickly. Please wait a moment and try again.");
      } else if (err.status === 401) {
        setError("Your session has expired. Please log out and log back in.");
      } else {
        setError(err.message || "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleFeedback(suggestion, action) {
    try {
      await api.sendFeedback(suggestion, action);
      setFeedbackGiven((prev) => ({ ...prev, [suggestion]: action }));
    } catch {
      // Non-critical -- fail silently in UI, feedback just won't be recorded.
    }
  }

  function useExample(example) {
    setDescription(example.description);
    setInterests(example.interests);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-1">
        <Sparkles className="w-6 h-6 text-accent" />
        <h1 className="text-3xl font-bold text-white">Generate Conversation Starters</h1>
      </div>
      <p className="text-white/50 mb-8">
        Tell us about the event and your interests — we'll craft personalized icebreakers.
      </p>

      <GlassCard className="mb-6">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Event description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="e.g. AI for Sustainable Cities conference"
              className="w-full bg-bg-secondary border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Your interests (comma-separated)</label>
            <input
              type="text"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="e.g. climate change, urban planning"
              className="w-full bg-bg-secondary border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((ex) => (
              <button
                type="button"
                key={ex.description}
                onClick={() => useExample(ex)}
                className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                {ex.description}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} icon={Sparkles}>
            Generate Starters
          </Button>
        </form>
      </GlassCard>

      {loading && <LoadingSpinner label="Generating personalized conversation starters..." />}

      {!loading && themes.length > 0 && (
        <GlassCard className="mb-6" delay={0.1}>
          <h3 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4" /> Detected Themes
          </h3>
          <div className="flex flex-wrap gap-2">
            {themes.map((t) => (
              <span
                key={t}
                className="px-3 py-1 rounded-full text-xs font-medium bg-accent/15 text-accent border border-accent/20"
              >
                {t}
              </span>
            ))}
          </div>
        </GlassCard>
      )}

      {!loading && suggestions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white/70">Suggested Conversation Starters</h3>
          {suggestions.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass rounded-xl p-4 flex items-start justify-between gap-4"
            >
              <p className="text-white/85 text-sm leading-relaxed">
                <span className="text-accent font-semibold mr-2">{i + 1}.</span>
                {s}
              </p>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleFeedback(s, "like")}
                  className={`p-2 rounded-lg transition-colors ${
                    feedbackGiven[s] === "like"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "text-white/30 hover:text-emerald-400 hover:bg-emerald-500/10"
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleFeedback(s, "dislike")}
                  className={`p-2 rounded-lg transition-colors ${
                    feedbackGiven[s] === "dislike"
                      ? "bg-red-500/20 text-red-400"
                      : "text-white/30 hover:text-red-400 hover:bg-red-500/10"
                  }`}
                >
                  <ThumbsDown className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}