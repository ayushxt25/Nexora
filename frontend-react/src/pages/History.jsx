import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Calendar, History as HistoryIcon, RefreshCw, Search, Sparkles, Tag } from "lucide-react";
import { api } from "../api/client";
import CustomSelect from "../components/ui/CustomSelect";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import { SkeletonCard } from "../components/ui/SkeletonLoader";

function formatDate(value) {
  if (!value) return "No timestamp";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getGroupLabel(value) {
  if (!value) return "Undated";
  const created = new Date(value);
  const now = new Date();
  const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays <= 7) return "Last 7 days";
  if (diffDays <= 30) return "Last 30 days";
  return "Earlier";
}

export default function History() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [themeFilter, setThemeFilter] = useState("");

  useEffect(() => {
    api
      .getHistory()
      .then((data) => setHistory(data || []))
      .catch((err) => setError(err.message || "Couldn't load history."))
      .finally(() => setLoading(false));
  }, []);

  const themeOptions = useMemo(
    () =>
      [...new Set(history.flatMap((entry) => entry.themes || []).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [history]
  );

  const themeSelectOptions = useMemo(
    () => [{ value: "", label: "All themes" }, ...themeOptions.map((theme) => ({ value: theme, label: theme }))],
    [themeOptions]
  );

  const filteredHistory = useMemo(() => {
    let entries = [...history];

    if (query.trim()) {
      const search = query.trim().toLowerCase();
      entries = entries.filter((entry) =>
        [entry.description, ...(entry.interests || []), ...(entry.themes || []), ...(entry.suggestions || [])]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(search))
      );
    }

    if (themeFilter) {
      entries = entries.filter((entry) => (entry.themes || []).includes(themeFilter));
    }

    return entries;
  }, [history, query, themeFilter]);

  const groupedHistory = useMemo(() => {
    return filteredHistory.reduce((acc, entry) => {
      const label = getGroupLabel(entry.created_at);
      if (!acc[label]) acc[label] = [];
      acc[label].push(entry);
      return acc;
    }, {});
  }, [filteredHistory]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorState message={error} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6"
    >
      <section>
        <div className="flex items-center gap-2">
          <HistoryIcon className="h-5 w-5 text-accent" />
          <h1 className="text-2xl font-semibold text-white">History</h1>
        </div>
        <p className="mt-2 text-sm text-white/50">
          Review recent preparation runs, search by theme or topic, and reuse the same context instantly.
        </p>
      </section>

      <section className="glass rounded-2xl p-4 lg:p-5 space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by scenario, theme, interest, or generated line"
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-accent/50"
            />
          </div>

          <CustomSelect
            value={themeFilter}
            onChange={setThemeFilter}
            options={themeSelectOptions}
            placeholder="All themes"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-white/45">
          <span>{filteredHistory.length} entries</span>
          <span className="text-white/20">|</span>
          <span>{themeOptions.length} unique themes</span>
          <span className="text-white/20">|</span>
          <span>Backend currently returns the 5 most recent history items</span>
        </div>
      </section>

      {!filteredHistory.length ? (
        <div className="glass rounded-2xl">
          <EmptyState
            icon={HistoryIcon}
            title="No matching history"
            description={
              history.length
                ? "Try clearing your search or theme filter."
                : "Successful generations are saved automatically and will appear here."
            }
            actionLabel={history.length ? "Clear filters" : "Open generator"}
            onAction={() => {
              if (history.length) {
                setQuery("");
                setThemeFilter("");
              } else {
                navigate("/generate");
              }
            }}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedHistory).map(([groupLabel, entries]) => (
            <section key={groupLabel} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium uppercase tracking-wide text-white/55">{groupLabel}</h2>
                <span className="text-xs text-white/35">{entries.length}</span>
              </div>

              <div className="grid gap-4">
                {entries.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: index * 0.04 }}
                    className="glass rounded-2xl p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-white">{entry.description}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/40">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(entry.created_at)}
                          </span>
                          <span>{entry.suggestions?.length || 0} generated starters</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            navigate("/generate", {
                              state: {
                                prefill: {
                                  description: entry.description,
                                  interests: (entry.interests || []).join(", "),
                                  sourceType: "history",
                                  sourceTitle: "History reuse",
                                },
                              },
                            })
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-accent/25 bg-accent/12 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/20 transition-colors"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Reuse
                        </button>
                      </div>
                    </div>

                    {(entry.interests || []).length ? (
                      <div className="mt-4">
                        <p className="text-xs uppercase tracking-wide text-white/35">Interests</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {entry.interests.map((interest) => (
                            <span
                              key={interest}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {(entry.themes || []).length ? (
                      <div className="mt-4">
                        <p className="text-xs uppercase tracking-wide text-white/35">Detected themes</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {entry.themes.map((theme) => (
                            <span
                              key={theme}
                              className="inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent/12 px-3 py-1 text-xs text-accent"
                            >
                              <Tag className="h-3 w-3" />
                              {theme}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {(entry.suggestions || []).length ? (
                      <div className="mt-4 space-y-2 border-t border-white/5 pt-4">
                        <p className="text-xs uppercase tracking-wide text-white/35">Generated starters</p>
                        {entry.suggestions.map((suggestion) => (
                          <div
                            key={suggestion}
                            className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/70"
                          >
                            <span className="inline-flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-accent" />
                              {suggestion}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </motion.div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </motion.div>
  );
}
