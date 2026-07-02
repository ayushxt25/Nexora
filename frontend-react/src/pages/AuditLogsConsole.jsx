import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, ScrollText, Search } from "lucide-react";
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

function parseMetadata(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export default function AuditLogsConsole() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eventType, setEventType] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [entityType, setEntityType] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.audit.logs({
        limit: 50,
        event_type: eventType,
        status_filter: statusFilter,
        entity_type: entityType,
        sort_order: sortOrder,
      });
      setLogs(data || []);
    } catch (err) {
      setError(err.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }, [entityType, eventType, sortOrder, statusFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const eventTypeOptions = useMemo(
    () => [...new Set(logs.map((item) => item.event_type).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [logs]
  );
  const entityTypeOptions = useMemo(
    () => [...new Set(logs.map((item) => item.entity_type).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [logs]
  );

  const eventTypeSelectOptions = [
    { value: "", label: "All event types" },
    ...eventTypeOptions.map((option) => ({ value: option, label: option })),
  ];

  const statusOptions = [
    { value: "", label: "All statuses" },
    { value: "completed", label: "completed" },
    { value: "attempted", label: "attempted" },
    { value: "failed", label: "failed" },
  ];

  const entityTypeSelectOptions = [
    { value: "", label: "All entity types" },
    ...entityTypeOptions.map((option) => ({ value: option, label: option })),
  ];

  const sortOptions = [
    { value: "desc", label: "Newest first" },
    { value: "asc", label: "Oldest first" },
  ];

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
        <ErrorState message={error} onRetry={loadLogs} />
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
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-amber-200">
            Developer / Internal
          </span>
          <div className="mt-3 flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-amber-300" />
            <h1 className="text-2xl font-semibold text-white">Audit Logs</h1>
          </div>
          <p className="mt-2 text-sm text-white/50">
            Inspect backend audit events for generation, retrieval, recommendations, ML ranking, and task dispatches.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-100 hover:bg-amber-500/15 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh logs
        </button>
      </section>

      <section className="glass rounded-2xl p-4 lg:p-5 space-y-4">
        <div className="grid gap-3 lg:grid-cols-4">
          <CustomSelect
            value={eventType}
            onChange={setEventType}
            options={eventTypeSelectOptions}
            placeholder="All event types"
            icon={Search}
          />

          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            placeholder="All statuses"
          />

          <CustomSelect
            value={entityType}
            onChange={setEntityType}
            options={entityTypeSelectOptions}
            placeholder="All entity types"
          />

          <CustomSelect
            value={sortOrder}
            onChange={setSortOrder}
            options={sortOptions}
            placeholder="Newest first"
          />
        </div>
      </section>

      {!logs.length ? (
        <div className="glass rounded-2xl">
          <EmptyState
            icon={ScrollText}
            title="No audit logs found"
            description="Try broadening the filters or trigger backend activity to generate new audit events."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((entry, index) => {
            const metadata = parseMetadata(entry.metadata_json);
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                className="glass rounded-2xl p-5"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
                        {entry.event_type}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/50">
                        {entry.status}
                      </span>
                      {entry.entity_type ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/50">
                          {entry.entity_type}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm text-white/75">{entry.message || "No message provided."}</p>
                    <p className="mt-2 text-xs text-white/35">{formatDate(entry.created_at)}</p>
                  </div>

                  <div className="rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3 text-xs text-white/45 lg:min-w-[220px]">
                    <p>ID: {entry.id}</p>
                    {entry.entity_id ? <p className="mt-1">Entity ID: {entry.entity_id}</p> : null}
                    {entry.user_id ? <p className="mt-1">User ID: {entry.user_id}</p> : null}
                  </div>
                </div>

                {metadata ? (
                  <div className="mt-4 rounded-xl border border-white/6 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-wide text-white/35">Metadata</p>
                    <pre className="mt-2 overflow-x-auto text-xs leading-6 text-white/55">
                      {typeof metadata === "string" ? metadata : JSON.stringify(metadata, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
