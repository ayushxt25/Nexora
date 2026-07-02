import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Database, Gauge, Layers3, RefreshCw, ServerCog } from "lucide-react";
import { api } from "../api/client";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import StatCard from "../components/ui/StatCard";
import { SkeletonCard } from "../components/ui/SkeletonLoader";
import { DonutChart, MiniBarChart } from "../components/ui/SimpleCharts";

function formatPercent(value) {
  return `${Math.round((value || 0) * 100)}%`;
}

function formatDuration(seconds) {
  if (!seconds) return "0s";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes}m ${remainder}s`;
}

function InsightCard({ title, subtitle, children, icon: Icon }) {
  return (
    <section className="glass rounded-2xl p-5 lg:p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/15 bg-amber-500/10">
          <Icon className="h-4 w-4 text-amber-300" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          {subtitle ? <p className="text-sm text-white/45">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function MetricsConsole() {
  const [metrics, setMetrics] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsData, summaryData] = await Promise.all([api.metrics.get(), api.metrics.summary()]);
      setMetrics(metricsData);
      setSummary(summaryData);
    } catch (err) {
      setError(err.message || "Failed to load developer metrics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const endpointChartData = useMemo(
    () =>
      Object.entries(metrics?.api?.endpoint_counts || {})
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    [metrics]
  );

  const cacheSegments = useMemo(
    () => [
      { label: "Hits", value: metrics?.cache?.cache_hits || 0, color: "#22c55e" },
      { label: "Misses", value: metrics?.cache?.cache_misses || 0, color: "#ef4444" },
    ],
    [metrics]
  );

  const dependencyEntries = useMemo(
    () => Object.entries(metrics?.dependency_status || {}),
    [metrics]
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid gap-4 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
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
            <Activity className="h-5 w-5 text-amber-300" />
            <h1 className="text-2xl font-semibold text-white">Metrics</h1>
          </div>
          <p className="mt-2 text-sm text-white/50">
            Runtime counters, dependency status, and backend effectiveness telemetry for debugging and observability.
          </p>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-100 hover:bg-amber-500/15 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh metrics
        </button>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Uptime" value={formatDuration(metrics?.uptime_seconds)} icon={Gauge} />
        <StatCard label="Requests" value={metrics?.api?.request_count || 0} icon={Activity} />
        <StatCard label="Errors" value={metrics?.api?.error_count || 0} icon={ServerCog} />
        <StatCard label="Retrievals" value={metrics?.retrieval?.retrieval_count || 0} icon={Layers3} />
        <StatCard label="Cache hit ratio" value={formatPercent(metrics?.cache?.hit_ratio)} icon={Database} />
        <StatCard label="Task failures" value={metrics?.background_tasks?.dispatch_failures || 0} icon={RefreshCw} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <InsightCard
          title="Human-readable summary"
          subtitle="Directly from GET /metrics/summary."
          icon={ServerCog}
        >
          {summary?.summary ? (
            <p className="text-sm leading-7 text-white/70">{summary.summary}</p>
          ) : (
            <EmptyState title="No summary available" description="The backend did not return a metrics summary string." />
          )}
        </InsightCard>

        <InsightCard
          title="Dependency status"
          subtitle={`Service health snapshot: ${metrics?.service_health_snapshot || "unknown"}`}
          icon={Database}
        >
          {dependencyEntries.length ? (
            <div className="grid gap-3">
              {dependencyEntries.map(([name, status]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3"
                >
                  <span className="text-sm text-white/65">{name}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/55">
                    {String(status)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No dependency status" description="No dependency health details were returned." />
          )}
        </InsightCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <InsightCard title="API endpoint activity" subtitle="Most-hit endpoints in the current runtime." icon={Activity}>
          <MiniBarChart data={endpointChartData} />
        </InsightCard>

        <InsightCard title="Cache performance" subtitle="Hit and miss counts from the cache layer." icon={Database}>
          <DonutChart segments={cacheSegments} />
        </InsightCard>

        <InsightCard title="User effectiveness" subtitle="Recommendation and opportunity metrics for the authenticated user." icon={Gauge}>
          {metrics?.user_effectiveness ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-white/35">Recommendations</p>
                <p className="mt-2 text-sm text-white/70">
                  Acceptance {formatPercent(metrics.user_effectiveness.recommendations.acceptance_rate)} | Rejection{" "}
                  {formatPercent(metrics.user_effectiveness.recommendations.rejection_rate)}
                </p>
                <p className="mt-1 text-xs text-white/45">
                  Feedback count: {metrics.user_effectiveness.recommendations.feedback_count}
                </p>
              </div>
              <div className="rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-white/35">Opportunities</p>
                <p className="mt-2 text-sm text-white/70">
                  Conversion {formatPercent(metrics.user_effectiveness.opportunities.opportunity_conversion_rate)}
                </p>
                <p className="mt-1 text-xs text-white/45">
                  Completed: {metrics.user_effectiveness.opportunities.completed_follow_ups} /{" "}
                  {metrics.user_effectiveness.opportunities.tracked_follow_ups}
                </p>
              </div>
            </div>
          ) : (
            <EmptyState title="No user effectiveness metrics" description="The backend did not return user effectiveness data." />
          )}
        </InsightCard>
      </div>
    </motion.div>
  );
}
