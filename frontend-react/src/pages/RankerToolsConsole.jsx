import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BrainCircuit, RefreshCw, SlidersHorizontal, Sparkles } from "lucide-react";
import { api } from "../api/client";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import StatCard from "../components/ui/StatCard";
import { SkeletonCard } from "../components/ui/SkeletonLoader";
import { DonutChart, MiniBarChart } from "../components/ui/SimpleCharts";

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

export default function RankerToolsConsole() {
  const [status, setStatus] = useState(null);
  const [trainingData, setTrainingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [training, setTraining] = useState(false);
  const [trainResult, setTrainResult] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusData, trainingRows] = await Promise.all([
        api.recommendations.rankerStatus(),
        api.recommendations.trainingData(),
      ]);
      setStatus(statusData);
      setTrainingData(trainingRows || []);
    } catch (err) {
      setError(err.message || "Failed to load ranker tools.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleTrain() {
    setTraining(true);
    setError(null);
    try {
      const result = await api.recommendations.trainRanker();
      setTrainResult(result);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to train ranker.");
    } finally {
      setTraining(false);
    }
  }

  const labelSegments = useMemo(() => {
    const labeled = trainingData.filter((row) => row.label !== null);
    const positives = labeled.filter((row) => row.label > 0).length;
    const negatives = labeled.filter((row) => row.label <= 0).length;
    return [
      { label: "Positive", value: positives, color: "#22c55e" },
      { label: "Negative", value: negatives, color: "#ef4444" },
    ];
  }, [trainingData]);

  const typeChartData = useMemo(() => {
    const counts = new Map();
    for (const row of trainingData) {
      counts.set(row.recommendation_type, (counts.get(row.recommendation_type) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [trainingData]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid gap-4 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorState message={error} onRetry={loadData} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6"
    >
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-amber-200">
            Developer / Internal
          </span>
          <div className="mt-3 flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-amber-300" />
            <h1 className="text-2xl font-semibold text-white">Ranker Tools</h1>
          </div>
          <p className="mt-2 text-sm text-white/50">
            Inspect ML ranker readiness, training rows, and manually trigger local ranker training.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={handleTrain}
            disabled={training}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              training
                ? "border border-amber-500/10 bg-amber-500/5 text-amber-100/50"
                : "border border-amber-500/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15"
            }`}
          >
            {training ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Train ranker
          </button>
        </div>
      </section>

      {error ? <ErrorState message={error} onRetry={loadData} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Enabled" value={status?.enabled ? "Yes" : "No"} icon={SlidersHorizontal} />
        <StatCard label="Model available" value={status?.model_available ? "Yes" : "No"} icon={BrainCircuit} />
        <StatCard label="Trained" value={status?.trained ? "Yes" : "No"} icon={Sparkles} />
        <StatCard label="Labeled rows" value={status?.labeled_rows ?? 0} icon={RefreshCw} />
        <StatCard label="Min labeled rows" value={status?.min_labeled_rows ?? 0} icon={RefreshCw} />
      </div>

      {trainResult ? (
        <section className="glass rounded-2xl p-5 lg:p-6">
          <h2 className="text-base font-semibold text-white">Latest training run</h2>
          <p className="mt-2 text-sm text-white/65">
            Status: {trainResult.status} | Trained: {trainResult.trained ? "yes" : "no"} | Labeled rows:{" "}
            {trainResult.labeled_rows} / {trainResult.min_labeled_rows}
          </p>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="glass rounded-2xl p-5 lg:p-6">
          <div className="mb-4 flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-amber-300" />
            <h2 className="text-base font-semibold text-white">Label distribution</h2>
          </div>
          <DonutChart segments={labelSegments} />
        </section>

        <section className="glass rounded-2xl p-5 lg:p-6">
          <div className="mb-4 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-amber-300" />
            <h2 className="text-base font-semibold text-white">Recommendation type coverage</h2>
          </div>
          <MiniBarChart data={typeChartData} colorClass="bg-amber-400" />
        </section>
      </div>

      {!trainingData.length ? (
        <div className="glass rounded-2xl">
          <EmptyState
            icon={BrainCircuit}
            title="No training data available"
            description="The backend has not produced recommendation impression and feedback rows for this user yet."
          />
        </div>
      ) : (
        <section className="glass rounded-2xl p-5 lg:p-6">
          <div className="mb-4 flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-amber-300" />
            <h2 className="text-base font-semibold text-white">Training rows</h2>
          </div>
          <div className="space-y-3">
            {trainingData.map((row) => (
              <div key={row.recommendation_id} className="rounded-xl border border-white/6 bg-white/[0.03] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
                        {row.recommendation_type}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/50">
                        score {row.priority_score}
                      </span>
                      {row.feedback_category ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/50">
                          {row.feedback_category}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm text-white/70">{row.reason}</p>
                    <p className="mt-2 text-xs text-white/35">{formatDate(row.created_at)}</p>
                  </div>

                  <div className="rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3 text-xs text-white/45 lg:min-w-[240px]">
                    <p>Recommendation ID: {row.recommendation_id}</p>
                    <p className="mt-1">Label: {row.label === null ? "unlabeled" : row.label}</p>
                    <p className="mt-1">Has contact: {row.has_contact ? "yes" : "no"}</p>
                    <p className="mt-1">Has event: {row.has_event ? "yes" : "no"}</p>
                    <p className="mt-1">Has follow-up: {row.has_follow_up ? "yes" : "no"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </motion.div>
  );
}
