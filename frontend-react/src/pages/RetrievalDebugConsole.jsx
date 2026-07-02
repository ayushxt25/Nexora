import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Radar, RefreshCw, Search } from "lucide-react";
import { api } from "../api/client";
import CustomSelect from "../components/ui/CustomSelect";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import { SkeletonCard } from "../components/ui/SkeletonLoader";
import { MiniBarChart } from "../components/ui/SimpleCharts";

function formatScore(value) {
  return Number(value || 0).toFixed(1);
}

const topKOptions = [3, 5, 7, 10].map((value) => ({ value, label: `Top ${value}` }));

export default function RetrievalDebugConsole() {
  const [query, setQuery] = useState("");
  const [interests, setInterests] = useState("");
  const [themes, setThemes] = useState("");
  const [opportunityType, setOpportunityType] = useState("");
  const [recommendationType, setRecommendationType] = useState("");
  const [topK, setTopK] = useState(5);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(event) {
    event.preventDefault();
    if (!query.trim()) {
      setError("Please enter a retrieval query.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await api.retrieval.debug({
        q: query,
        top_k: topK,
        interests,
        themes,
        opportunity_type: opportunityType,
        recommendation_type: recommendationType,
      });
      setResults(data || []);
      setHasSearched(true);
    } catch (err) {
      setError(err.message || "Failed to run retrieval debug.");
      setResults([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  }

  const componentChart = useMemo(() => {
    if (!results.length) return [];
    const item = results[0];
    return Object.entries(item.components || {}).map(([label, value]) => ({ label, value }));
  }, [results]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6"
    >
      <section>
        <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-amber-200">
          Developer / Internal
        </span>
        <div className="mt-3 flex items-center gap-2">
          <Radar className="h-5 w-5 text-amber-300" />
          <h1 className="text-2xl font-semibold text-white">Retrieval Debug</h1>
        </div>
        <p className="mt-2 text-sm text-white/50">
          Inspect advanced retrieval outputs, score breakdowns, reasons, and metadata using the live backend retrieval
          pipeline.
        </p>
      </section>

      <section className="glass rounded-2xl p-5 lg:p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Example: healthcare ai founder"
                className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/40"
              />
            </div>

            <input
              type="text"
              value={interests}
              onChange={(event) => setInterests(event.target.value)}
              placeholder="Interests CSV"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/40"
            />

            <input
              type="text"
              value={themes}
              onChange={(event) => setThemes(event.target.value)}
              placeholder="Themes CSV"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/40"
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <input
              type="text"
              value={opportunityType}
              onChange={(event) => setOpportunityType(event.target.value)}
              placeholder="Preferred opportunity type"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/40"
            />
            <input
              type="text"
              value={recommendationType}
              onChange={(event) => setRecommendationType(event.target.value)}
              placeholder="Preferred recommendation type"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/40"
            />
            <CustomSelect
              value={topK}
              onChange={(value) => setTopK(Number(value))}
              options={topKOptions}
              placeholder="Top 5"
            />
          </div>

          {error ? <ErrorState message={error} /> : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-100 hover:bg-amber-500/15 transition-colors"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Run debug search
            </button>
          </div>
        </form>
      </section>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : null}

      {!loading && !hasSearched ? (
        <div className="glass rounded-2xl">
          <EmptyState
            icon={Radar}
            title="No retrieval run yet"
            description="Run a debug search to inspect top retrieved entities, score components, and reasoning."
          />
        </div>
      ) : null}

      {!loading && hasSearched && !results.length && !error ? (
        <div className="glass rounded-2xl">
          <EmptyState
            icon={Radar}
            title="No retrieval results"
            description="The backend returned no retrieval matches for this query and filter combination."
          />
        </div>
      ) : null}

      {!loading && results.length ? (
        <>
          <section className="glass rounded-2xl p-5 lg:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Radar className="h-4 w-4 text-amber-300" />
              <h2 className="text-base font-semibold text-white">Top result score breakdown</h2>
            </div>
            <MiniBarChart data={componentChart} valueFormatter={(value) => formatScore(value)} colorClass="bg-amber-400" />
          </section>

          <div className="space-y-4">
            {results.map((item, index) => (
              <motion.section
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className="glass rounded-2xl p-5 lg:p-6"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
                        {item.entity_type}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/50">
                        score {formatScore(item.retrieval_score)}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/50">
                        record {item.record_id}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-white/75">{item.text}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
                  <div className="rounded-xl border border-white/6 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-wide text-white/35">Reasons</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(item.reasons || []).map((reason) => (
                        <span
                          key={reason}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/6 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-wide text-white/35">Metadata</p>
                    <pre className="mt-2 overflow-x-auto text-xs leading-6 text-white/55">
                      {JSON.stringify(item.metadata || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              </motion.section>
            ))}
          </div>
        </>
      ) : null}
    </motion.div>
  );
}
