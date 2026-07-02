import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpDown,
  CalendarDays,
  MapPin,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { useEvents } from "../hooks/useEvents";
import { api } from "../api/client";
import DataTable from "../components/ui/DataTable";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import EventForm from "../components/domain/EventForm";

function formatDate(value) {
  if (!value) return "No date scheduled";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getEventStatus(eventDate) {
  if (!eventDate) return "unscheduled";
  const now = new Date();
  const event = new Date(eventDate);
  if (event < now) return "past";
  return "upcoming";
}

const SORT_OPTIONS = [
  { value: "event_date:asc", label: "Soonest first" },
  { value: "event_date:desc", label: "Latest first" },
  { value: "title:asc", label: "Title A-Z" },
  { value: "updated_at:desc", label: "Recently updated" },
];

export default function Events() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [sortValue, setSortValue] = useState("event_date:asc");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [sortBy, sortOrder] = sortValue.split(":");
  const { events, loading, error, refetch } = useEvents({ q: query, location, sortBy, sortOrder });

  const locationOptions = useMemo(
    () =>
      [...new Set(events.map((event) => event.location).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [events]
  );

  const upcomingCount = useMemo(
    () => events.filter((event) => getEventStatus(event.event_date) === "upcoming").length,
    [events]
  );

  async function handleCreate(payload) {
    setSubmitting(true);
    try {
      await api.events.create(payload);
      setCreateOpen(false);
      refetch();
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      key: "title",
      label: "Event",
      width: "2fr",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{row.title}</p>
          <p className="mt-1 truncate text-xs text-white/45">{row.description || "No description yet"}</p>
        </div>
      ),
    },
    {
      key: "location",
      label: "Location",
      width: "1.25fr",
      render: (row) =>
        row.location ? (
          <span className="inline-flex items-center gap-1.5 text-white/70">
            <MapPin className="h-3.5 w-3.5 text-white/35" />
            {row.location}
          </span>
        ) : (
          "No location"
        ),
    },
    {
      key: "event_date",
      label: "Date",
      width: "1fr",
      render: (row) => formatDate(row.event_date),
    },
    {
      key: "goals",
      label: "Goals",
      width: "1.5fr",
      render: (row) =>
        row.goals?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {row.goals.slice(0, 2).map((goal) => (
              <span
                key={goal}
                className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/55"
              >
                {goal}
              </span>
            ))}
            {row.goals.length > 2 && <span className="text-xs text-white/30">+{row.goals.length - 2}</span>}
          </div>
        ) : (
          "No goals"
        ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6"
    >
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-accent" />
            <h1 className="text-2xl font-semibold text-white">Events</h1>
          </div>
          <p className="mt-2 text-sm text-white/50">
            Track upcoming meetings, conferences, and event-driven relationship opportunities.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add event
        </button>
      </section>

      <section className="glass rounded-2xl p-4 lg:p-5 space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search events by title or description"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-accent/50"
            />
          </div>

          <select
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent/50"
          >
            <option value="">All locations</option>
            {locationOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/70">
            <ArrowUpDown className="h-4 w-4 text-white/35" />
            <select
              value={sortValue}
              onChange={(event) => setSortValue(event.target.value)}
              className="w-full bg-transparent text-sm text-white focus:outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!loading && !error && events.length > 0 && (
          <div className="flex flex-wrap gap-3 text-xs text-white/45">
            <span>{events.length} events loaded</span>
            <span className="text-white/20">•</span>
            <span>{upcomingCount} upcoming</span>
            <span className="text-white/20">•</span>
            <span>{events.filter((event) => !event.event_date).length} unscheduled</span>
          </div>
        )}
      </section>

      {!loading && !error && events.length === 0 && (query || location) ? (
        <div className="glass rounded-2xl">
          <EmptyState
            icon={Search}
            title="No events match these filters"
            description="Try another title search or location filter."
            actionLabel="Clear filters"
            onAction={() => {
              setQuery("");
              setLocation("");
              setSortValue("event_date:asc");
            }}
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={events}
          loading={loading}
          error={error}
          onRetry={refetch}
          onRowClick={(row) => setSelectedEvent(row)}
          emptyIcon={CalendarDays}
          emptyTitle="No events yet"
          emptyDescription="Create an event to start tracking upcoming networking moments and AI prep context."
          emptyActionLabel="Add event"
          onEmptyAction={() => setCreateOpen(true)}
        />
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add event">
        <EventForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} submitting={submitting} />
      </Modal>

      <Modal open={Boolean(selectedEvent)} onClose={() => setSelectedEvent(null)} title={selectedEvent?.title || "Event details"}>
        {selectedEvent && (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-wide text-white/35">Status</p>
              <p className="mt-2 text-sm capitalize text-white/70">{getEventStatus(selectedEvent.event_date)}</p>
            </div>

            {selectedEvent.description ? (
              <div>
                <p className="text-sm font-medium text-white">Description</p>
                <p className="mt-2 text-sm leading-6 text-white/60">{selectedEvent.description}</p>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-wide text-white/35">Date</p>
                <p className="mt-2 text-sm text-white/70">{formatDate(selectedEvent.event_date)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-wide text-white/35">Location</p>
                <p className="mt-2 text-sm text-white/70">{selectedEvent.location || "Not set"}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-white">Goals</p>
              {selectedEvent.goals?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedEvent.goals.map((goal) => (
                    <span
                      key={goal}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60"
                    >
                      {goal}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-white/45">No goals saved for this event yet.</p>
              )}
            </div>

            <button
              onClick={() => {
                setSelectedEvent(null);
                navigate("/generate", {
                  state: {
                    prefill: {
                      description: selectedEvent.description || selectedEvent.title,
                      interests: selectedEvent.goals?.join(", ") || "",
                      sourceType: "event",
                      sourceTitle: selectedEvent.title,
                      event: {
                        id: selectedEvent.id,
                        title: selectedEvent.title,
                        location: selectedEvent.location,
                        date: selectedEvent.event_date,
                        goals: selectedEvent.goals,
                      },
                    },
                  },
                });
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-accent/25 bg-accent/12 px-3.5 py-2 text-sm font-medium text-accent hover:bg-accent/20 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Use in AI prep
            </button>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
