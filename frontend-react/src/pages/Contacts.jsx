import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowUpDown,
  CalendarClock,
  MessageSquarePlus,
  Plus,
  Search,
  Users2,
} from "lucide-react";
import { useContacts } from "../hooks/useContacts";
import { api } from "../api/client";
import DataTable from "../components/ui/DataTable";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import ScoreBadge from "../components/ui/ScoreBadge";
import ContactForm from "../components/domain/ContactForm";

function formatDate(value) {
  if (!value) return "No interactions yet";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function relationshipLabel(value) {
  if (!value) return "No score yet";
  return value.replaceAll("_", " ");
}

const SORT_OPTIONS = [
  { value: "updated_at:desc", label: "Recently updated" },
  { value: "name:asc", label: "Name A-Z" },
  { value: "company:asc", label: "Company A-Z" },
  { value: "relationship_strength:desc", label: "Strongest relationship" },
  { value: "created_at:desc", label: "Newest first" },
];

export default function Contacts() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState("");
  const [tag, setTag] = useState("");
  const [sortValue, setSortValue] = useState("updated_at:desc");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [sortBy, sortOrder] = sortValue.split(":");

  const { contacts, loading, error, refetch } = useContacts({
    q: query,
    company,
    tag,
    sortBy,
    sortOrder,
  });

  const companyOptions = useMemo(
    () =>
      [...new Set(contacts.map((contact) => contact.company).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [contacts]
  );

  const tagOptions = useMemo(
    () =>
      [
        ...new Set(
          contacts.flatMap((contact) => (Array.isArray(contact.tags) ? contact.tags : [])).filter(Boolean)
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [contacts]
  );

  async function handleCreate(payload) {
    setSubmitting(true);
    try {
      await api.contacts.create(payload);
      setModalOpen(false);
      refetch();
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      key: "name",
      label: "Contact",
      width: "2fr",
      render: (row) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{row.name}</p>
          <p className="text-xs text-white/45 truncate">{row.role || "Role unavailable"}</p>
        </div>
      ),
    },
    {
      key: "company",
      label: "Company",
      width: "1.4fr",
      render: (row) => row.company || "No company",
    },
    {
      key: "score",
      label: "Relationship",
      width: "1.3fr",
      render: (row) => (
        <div className="flex flex-col items-start gap-1">
          <ScoreBadge score={row.score} size="sm" />
          <span className="text-xs text-white/40 capitalize">{relationshipLabel(row.relationship_label)}</span>
        </div>
      ),
    },
    {
      key: "last_interaction_at",
      label: "Last Interaction",
      width: "1.2fr",
      render: (row) => (
        <span className="text-sm text-white/65">{formatDate(row.last_interaction_at)}</span>
      ),
    },
    {
      key: "actions",
      label: "Quick Actions",
      width: "1.3fr",
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/contacts/${row.id}`);
            }}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/65 hover:bg-white/10 hover:text-white transition-colors"
          >
            View
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/contacts/${row.id}`);
            }}
            className="rounded-lg border border-accent/25 bg-accent/12 px-2.5 py-1.5 text-xs text-accent hover:bg-accent/20 transition-colors"
          >
            Prep
          </button>
        </div>
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
            <Users2 className="h-5 w-5 text-accent" />
            <h1 className="text-2xl font-semibold text-white">Contacts</h1>
          </div>
          <p className="text-sm text-white/50 mt-2">
            Search, sort, and prioritize the people in your relationship pipeline.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add contact
        </button>
      </section>

      <section className="glass rounded-2xl p-4 lg:p-5 space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search by name, company, role, or note"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-accent/50"
            />
          </div>

          <select
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent/50"
          >
            <option value="">All companies</option>
            {companyOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={tag}
            onChange={(event) => setTag(event.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent/50"
          >
            <option value="">All tags</option>
            {tagOptions.map((option) => (
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

        {!loading && !error && contacts.length > 0 && (
          <div className="flex flex-wrap gap-3 text-xs text-white/45">
            <span>{contacts.length} contacts loaded</span>
            <span className="text-white/20">•</span>
            <span>
              {contacts.filter((contact) => contact.score !== null && contact.score >= 70).length} high-score relationships
            </span>
            <span className="text-white/20">•</span>
            <span>
              {
                contacts.filter((contact) => contact.last_interaction_at).length
              } with interaction history
            </span>
          </div>
        )}
      </section>

      {!loading && !error && contacts.length === 0 && (query || company || tag) ? (
        <div className="glass rounded-2xl">
          <EmptyState
            icon={Search}
            title="No contacts match these filters"
            description="Try a different search, company, or tag filter."
            actionLabel="Clear filters"
            onAction={() => {
              setQuery("");
              setCompany("");
              setTag("");
              setSortValue("updated_at:desc");
            }}
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={contacts}
          loading={loading}
          error={error}
          onRetry={refetch}
          onRowClick={(row) => navigate(`/contacts/${row.id}`)}
          emptyIcon={Users2}
          emptyTitle="No contacts yet"
          emptyDescription="Add your first contact to start tracking relationship strength, recency, and follow-ups."
          emptyActionLabel="Add contact"
          onEmptyAction={() => setModalOpen(true)}
        />
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock className="h-4 w-4 text-accent" />
            <p className="text-sm font-medium text-white">Last interaction date</p>
          </div>
          <p className="text-sm text-white/50">
            Computed from real `/interactions` history and shown directly in the list for prioritization.
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquarePlus className="h-4 w-4 text-accent" />
            <p className="text-sm font-medium text-white">Quick actions</p>
          </div>
          <p className="text-sm text-white/50">
            Use View to open the full CRM profile and Prep to jump into relationship context before outreach.
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpDown className="h-4 w-4 text-accent" />
            <p className="text-sm font-medium text-white">Backend-powered sorting</p>
          </div>
          <p className="text-sm text-white/50">
            Search, company filter, tag filter, and core sort options use the existing backend contact capabilities only.
          </p>
        </div>
      </section>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add contact">
        <ContactForm onSubmit={handleCreate} onCancel={() => setModalOpen(false)} submitting={submitting} />
      </Modal>
    </motion.div>
  );
}
