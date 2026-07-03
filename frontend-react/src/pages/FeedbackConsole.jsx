import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MessageSquareHeart, RefreshCw } from "lucide-react";
import { api } from "../api/client";
import CustomSelect from "../components/ui/CustomSelect";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import StatCard from "../components/ui/StatCard";
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

function BreakdownCard({ title, data, emptyText }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  return (
    <section className="glass rounded-2xl p-5 lg:p-6">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <div className="mt-4 space-y-3">
        {entries.length ? (
          entries.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3">
              <span className="text-sm text-white/65">{label}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/60">
                {value}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-white/45">{emptyText}</p>
        )}
      </div>
    </section>
  );
}

export default function FeedbackConsole() {
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState(null);
  const [targetType, setTargetType] = useState("");
  const [category, setCategory] = useState("");

  const loadSummary = useCallback(async () => {
    const summaryData = await api.feedback.adminSummary({ recent_limit: 12 });
    setSummary(summaryData);
    return summaryData;
  }, []);

  const loadList = useCallback(async (nextTargetType = targetType, nextCategory = category) => {
    setListLoading(true);
    try {
      const data = await api.feedback.adminList({
        limit: 40,
        target_type: nextTargetType || undefined,
        category: nextCategory || undefined,
      });
      setItems(data || []);
    } finally {
      setListLoading(false);
    }
  }, [category, targetType]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadSummary(), loadList("", "")]);
    } catch (err) {
      setError(err.message || "Failed to load feedback operations data.");
    } finally {
      setLoading(false);
    }
  }, [loadList, loadSummary]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!summary) return;
    loadList();
  }, [targetType, category, summary, loadList]);

  const targetOptions = useMemo(() => {
    const entries = Object.keys(summary?.counts_by_target_type || {}).sort((a, b) => a.localeCompare(b));
    return [{ value: "", label: "All target types" }, ...entries.map((value) => ({ value, label: value }))];
  }, [summary]);

  const categoryOptions = useMemo(() => {
    const entries = Object.keys(summary?.counts_by_category || {}).sort((a, b) => a.localeCompare(b));
    return [{ value: "", label: "All categories" }, ...entries.map((value) => ({ value, label: value }))];
  }, [summary]);

  const appFeedbackRecent = useMemo(
    () => (summary?.recent_feedback_items || []).filter((item) => item.target_type === "app_experience"),
    [summary]
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
            <MessageSquareHeart className="h-5 w-5 text-amber-300" />
            <h1 className="text-2xl font-semibold text-white">Feedback Ops</h1>
          </div>
          <p className="mt-2 text-sm text-white/50">
            Aggregate feedback signals across users to spot sentiment shifts, product bugs, confusing UX, and feature demand.
          </p>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-100 hover:bg-amber-500/15 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh feedback ops
        </button>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total feedback" value={summary?.total_feedback_count || 0} icon={MessageSquareHeart} />
        <StatCard label="Helpful signals" value={summary?.helpful_signal_count || 0} icon={MessageSquareHeart} />
        <StatCard label="Negative signals" value={summary?.negative_signal_count || 0} icon={MessageSquareHeart} />
        <StatCard label="App feedback" value={summary?.app_experience_feedback_count || 0} icon={MessageSquareHeart} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <BreakdownCard title="Target type breakdown" data={summary?.counts_by_target_type} emptyText="No target-type signals yet." />
        <BreakdownCard title="Category breakdown" data={summary?.counts_by_category} emptyText="No feedback categories yet." />
        <BreakdownCard title="App feedback signals" data={summary?.app_feedback_signal_counts} emptyText="No app-experience signals have been classified yet." />
      </div>

      <section className="glass rounded-2xl p-5 lg:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">Recent feedback feed</h2>
            <p className="mt-1 text-sm text-white/45">Minimal admin view with user IDs only. No extra account details are exposed here.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <CustomSelect value={targetType} onChange={setTargetType} options={targetOptions} placeholder="All target types" />
          <CustomSelect value={category} onChange={setCategory} options={categoryOptions} placeholder="All categories" />
        </div>

        <div className="mt-5 space-y-3">
          {listLoading ? (
            <div className="grid gap-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : items.length ? (
            items.map((item, index) => (
              <motion.div
                key={`${item.user_id}-${item.created_at}-${index}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: index * 0.02 }}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/60">
                    User {item.user_id}
                  </span>
                  {item.target_type ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/60">
                      {item.target_type}
                    </span>
                  ) : null}
                  {(item.category || item.action) ? (
                    <span className="rounded-full border border-amber-500/15 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-100">
                      {item.category || item.action}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm text-white/80">{item.suggestion}</p>
                {item.notes ? <p className="mt-2 text-sm text-white/50">{item.notes}</p> : null}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/35">
                  <span>{formatDate(item.created_at)}</span>
                  {item.target_id ? <span>Target: {item.target_id}</span> : null}
                </div>
              </motion.div>
            ))
          ) : (
            <EmptyState
              title="No feedback matches these filters"
              description="Try clearing the current filters or wait for more product feedback to be submitted."
              actionLabel="Clear filters"
              onAction={() => {
                setTargetType("");
                setCategory("");
              }}
            />
          )}
        </div>
      </section>

      <section className="glass rounded-2xl p-5 lg:p-6">
        <h2 className="text-base font-semibold text-white">App feedback highlights</h2>
        <p className="mt-1 text-sm text-white/45">Recent app-experience feedback only, useful for triaging product friction and requests.</p>
        <div className="mt-4 space-y-3">
          {appFeedbackRecent.length ? (
            appFeedbackRecent.map((item, index) => (
              <div key={`${item.user_id}-${item.created_at}-app-${index}`} className="rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
                  <span>User {item.user_id}</span>
                  <span>{formatDate(item.created_at)}</span>
                </div>
                <p className="mt-2 text-sm text-white/80">{item.suggestion}</p>
                {item.notes ? <p className="mt-1 text-sm text-white/50">{item.notes}</p> : null}
              </div>
            ))
          ) : (
            <EmptyState title="No app feedback yet" description="App-wide product feedback will appear here when users submit it from Help or future feedback entry points." />
          )}
        </div>
      </section>
    </motion.div>
  );
}
