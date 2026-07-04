import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  ArrowUpDown,
  CheckCircle2,
  Filter,
  Lightbulb,
  MessageSquareHeart,
  MessageSquareX,
  Plus,
  Search,
  Sparkles,
  Users2,
} from "lucide-react";
import { api } from "../api/client";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import Modal from "../components/ui/Modal";
import FollowUpForm from "../components/domain/FollowUpForm";
import CustomSelect from "../components/ui/CustomSelect";
import ScoreBadge from "../components/ui/ScoreBadge";
import { SkeletonCard } from "../components/ui/SkeletonLoader";

function formatDate(value) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function priorityTone(score) {
  if (score >= 85) return "text-red-300 bg-red-500/10 border-red-500/20";
  if (score >= 70) return "text-amber-300 bg-amber-500/10 border-amber-500/20";
  return "text-emerald-300 bg-emerald-500/10 border-emerald-500/20";
}

function getRecommendationSection(type) {
  if (["complete_overdue_follow_up", "follow_up_with_contact"].includes(type)) {
    return "Recommended Follow-ups";
  }
  if (type === "reconnect_with_cold_relationship") {
    return "Relationship Recovery Suggestions";
  }
  if (type === "strengthen_high_value_contact") {
    return "High Value Connection Suggestions";
  }
  return "Next Best Actions";
}

function getRecommendationEmptyCopy(sectionTitle) {
  switch (sectionTitle) {
    case "Next Best Actions":
      return {
        title: "No priority actions yet",
        description: "Nexora will surface the next best moves here as your relationship history grows.",
      };
    case "Recommended Follow-ups":
      return {
        title: "No follow-up prompts yet",
        description: "Add contacts, interactions, or follow-ups to unlock more timely follow-up guidance.",
      };
    case "Relationship Recovery Suggestions":
      return {
        title: "No recovery signals yet",
        description: "When a relationship starts to cool, recovery suggestions will appear here.",
      };
    case "High Value Connection Suggestions":
      return {
        title: "No high-value connection signals yet",
        description: "Strengthen a few key contacts and Nexora will highlight who deserves extra attention.",
      };
    default:
      return {
        title: "No signals yet",
        description: "Add more relationship activity to unlock this section.",
      };
  }
}

function getLifecycleTone(status) {
  if (status === "accepted") return "text-emerald-300 bg-emerald-500/10 border-emerald-500/20";
  if (status === "dismissed") return "text-red-300 bg-red-500/10 border-red-500/20";
  if (status === "completed") return "text-sky-300 bg-sky-500/10 border-sky-500/20";
  if (status === "converted_to_follow_up") return "text-violet-300 bg-violet-500/10 border-violet-500/20";
  return "text-white/55 bg-white/5 border-white/10";
}

function getInferredStatus(item, followUpMap) {
  if (!item.related_follow_up_id) return "No linked follow-up";
  const followUp = followUpMap.get(item.related_follow_up_id);
  if (!followUp) return "Linked follow-up unavailable";
  return followUp.status || "Unknown";
}

const recommendationFeedbackOptions = [
  { key: "helpful", label: "Helpful" },
  { key: "not_helpful", label: "Not helpful" },
  { key: "irrelevant", label: "Irrelevant" },
  { key: "too_generic", label: "Too generic" },
];

function RecommendationCard({
  item,
  contactName,
  relationshipScore,
  lifecycleStatus,
  followUpStatusLabel,
  onAccept,
  onOpenContact,
  onDismiss,
  onComplete,
  onConvert,
  onGenerate,
  onFeedback,
  accepting,
  dismissing,
  completing,
  feedbackSubmitting,
  feedbackValue,
  feedbackMessage,
  feedbackError,
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="glass min-w-0 overflow-hidden rounded-2xl p-5 transition-colors hover:border-white/12"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${priorityTone(
                item.priority_score
              )}`}
            >
              Priority {Math.round(item.priority_score)}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/50">
              {item.recommendation_type.replaceAll("_", " ")}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/50">
              {followUpStatusLabel}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getLifecycleTone(lifecycleStatus)}`}>
              {lifecycleStatus.replaceAll("_", " ")}
            </span>
          </div>

          <h3 className="mt-3 text-base font-semibold text-white">{item.title}</h3>
          <p className="mt-2 text-sm text-white/60">{item.description}</p>
          <p className="mt-3 text-sm text-white/45">{item.reason}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/40">
            <span>{formatDate(item.created_at)}</span>
            {contactName ? <span>{contactName}</span> : null}
            {relationshipScore !== null ? <ScoreBadge score={relationshipScore} size="sm" /> : null}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <MessageSquareHeart className="h-4 w-4 text-accent" />
          <p className="text-sm font-medium text-white">Rate this recommendation</p>
          <span className="text-xs text-white/35">Separate from accept, dismiss, and complete</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {recommendationFeedbackOptions.map((option) => {
            const active = feedbackValue === option.key;
            return (
              <button
                key={option.key}
                onClick={() => onFeedback(item, option.key)}
                disabled={feedbackSubmitting || active}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  active
                    ? "border-accent/30 bg-accent/15 text-accent"
                    : feedbackSubmitting
                      ? "border-white/10 bg-white/5 text-white/35"
                      : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {feedbackMessage ? (
          <p className="mt-3 text-xs text-emerald-300">{feedbackMessage}</p>
        ) : null}
        {feedbackError ? (
          <p className="mt-3 text-xs text-red-300">{feedbackError}</p>
        ) : null}
      </div>

      <div className="action-cluster mt-5">
        {item.related_contact_id ? (
          <button
            onClick={() => onOpenContact(item.related_contact_id)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            Open related contact
          </button>
        ) : null}

        <button
          onClick={() => onGenerate(item)}
          className="inline-flex items-center gap-2 rounded-xl border border-accent/25 bg-accent/12 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/20 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          Generate prep
        </button>

        <button
          onClick={() => onAccept(item)}
          disabled={accepting}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
            accepting
              ? "border-white/10 bg-white/5 text-white/35"
              : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
          }`}
        >
          <BadgeCheck className="h-4 w-4" />
          {accepting ? "Saving..." : "Accept"}
        </button>

        <button
          onClick={() => onConvert(item)}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Plus className="h-4 w-4" />
          Convert to follow-up
        </button>

        {item.related_follow_up_id ? (
          <button
            onClick={() => onComplete(item)}
            disabled={completing}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
              completing
                ? "border-white/10 bg-white/5 text-white/35"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            {completing ? "Saving..." : "Mark completed"}
          </button>
        ) : null}

        <button
          onClick={() => onDismiss(item)}
          disabled={dismissing}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
            dismissing
              ? "border-white/10 bg-white/5 text-white/35"
              : "border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/15"
          }`}
        >
          <MessageSquareX className="h-4 w-4" />
          {dismissing ? "Saving..." : "Dismiss"}
        </button>
      </div>
    </motion.div>
  );
}

export default function Recommendations() {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [scores, setScores] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [contactFilter, setContactFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("priority_desc");
  const [acceptingId, setAcceptingId] = useState(null);
  const [dismissingId, setDismissingId] = useState(null);
  const [completingId, setCompletingId] = useState(null);
  const [feedbackSubmittingId, setFeedbackSubmittingId] = useState(null);
  const [feedbackByRecommendationId, setFeedbackByRecommendationId] = useState({});
  const [feedbackMessageByRecommendationId, setFeedbackMessageByRecommendationId] = useState({});
  const [feedbackErrorByRecommendationId, setFeedbackErrorByRecommendationId] = useState({});
  const [followUpTarget, setFollowUpTarget] = useState(null);
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [recommendationsData, contactsData, scoresData, followUpsData] = await Promise.all([
        api.recommendations.list({ limit: 100, sort_by: "priority_score", sort_order: "desc" }),
        api.contacts.list({ limit: 100, sort_by: "name", sort_order: "asc" }).catch(() => []),
        api.relationshipScores.list().catch(() => ({ scores: [] })),
        api.followUps.list({ limit: 100, sort_by: "due_date", sort_order: "asc" }).catch(() => []),
      ]);
      setRecommendations(recommendationsData || []);
      setContacts(contactsData || []);
      setScores(scoresData?.scores || []);
      setFollowUps(followUpsData || []);
    } catch (err) {
      setError(err.message || "Failed to load recommendations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const contactMap = useMemo(() => new Map(contacts.map((contact) => [contact.id, contact])), [contacts]);
  const scoreMap = useMemo(() => new Map(scores.map((score) => [score.contact_id, score])), [scores]);
  const followUpMap = useMemo(() => new Map(followUps.map((followUp) => [followUp.id, followUp])), [followUps]);

  const enrichedRecommendations = useMemo(
    () =>
      recommendations.map((item) => ({
        ...item,
        section: getRecommendationSection(item.recommendation_type),
        contactName: item.related_contact_id ? contactMap.get(item.related_contact_id)?.name || null : null,
        relationshipScore:
          item.related_contact_id && scoreMap.has(item.related_contact_id)
            ? scoreMap.get(item.related_contact_id).score
            : null,
        lifecycleStatus: item.lifecycle_status || "new",
        followUpStatusLabel: getInferredStatus(item, followUpMap),
      })),
    [contactMap, followUpMap, recommendations, scoreMap]
  );

  const filteredRecommendations = useMemo(() => {
    let items = [...enrichedRecommendations];

    if (query.trim()) {
      const search = query.trim().toLowerCase();
      items = items.filter((item) =>
        [item.title, item.description, item.reason, item.contactName, item.recommendation_type]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(search))
      );
    }

    if (category) {
      items = items.filter((item) => item.section === category);
    }

    if (contactFilter) {
      items = items.filter((item) => String(item.related_contact_id || "") === contactFilter);
    }

    if (priorityFilter) {
      const minScore = Number(priorityFilter);
      items = items.filter((item) => item.priority_score >= minScore);
    }

    if (statusFilter) {
      items = items.filter((item) =>
        [item.lifecycleStatus, item.followUpStatusLabel]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(statusFilter.toLowerCase()))
      );
    }

    items.sort((a, b) => {
      switch (sortBy) {
        case "priority_asc":
          return a.priority_score - b.priority_score;
        case "relationship_desc":
          return (b.relationshipScore ?? -1) - (a.relationshipScore ?? -1);
        case "created_desc":
          return new Date(b.created_at) - new Date(a.created_at);
        case "created_asc":
          return new Date(a.created_at) - new Date(b.created_at);
        case "priority_desc":
        default:
          return b.priority_score - a.priority_score;
      }
    });

    return items;
  }, [category, contactFilter, enrichedRecommendations, priorityFilter, query, sortBy, statusFilter]);

  const groupedSections = useMemo(
    () => ({
      "Next Best Actions": filteredRecommendations
        .filter((item) => !["dismissed", "completed"].includes(item.lifecycleStatus))
        .slice(0, 5),
      "Recommended Follow-ups": filteredRecommendations.filter((item) => item.section === "Recommended Follow-ups"),
      "Relationship Recovery Suggestions": filteredRecommendations.filter(
        (item) => item.section === "Relationship Recovery Suggestions"
      ),
      "High Value Connection Suggestions": filteredRecommendations.filter(
        (item) => item.section === "High Value Connection Suggestions"
      ),
    }),
    [filteredRecommendations]
  );

  async function handleDismiss(item) {
    setDismissingId(item.recommendation_id);
    try {
      await api.actionLifecycle.update({
        entity_kind: "recommendation",
        entity_id: item.recommendation_id,
        entity_type: item.recommendation_type,
        status: "dismissed",
        notes: item.reason,
      });
      await loadData();
    } finally {
      setDismissingId(null);
    }
  }

  async function handleAccept(item) {
    setAcceptingId(item.recommendation_id);
    try {
      await api.actionLifecycle.update({
        entity_kind: "recommendation",
        entity_id: item.recommendation_id,
        entity_type: item.recommendation_type,
        status: "accepted",
        notes: item.reason,
      });
      await loadData();
    } finally {
      setAcceptingId(null);
    }
  }

  async function handleComplete(item) {
    setCompletingId(item.recommendation_id);
    try {
      if (item.related_follow_up_id) {
        const followUp = followUpMap.get(item.related_follow_up_id);
        if (followUp) {
          await api.followUps.update(item.related_follow_up_id, {
            title: followUp.title,
            description: followUp.description,
            due_date: followUp.due_date,
            contact_id: followUp.contact_id,
            event_id: followUp.event_id,
            status: "completed",
          });
        }
      }
      await api.actionLifecycle.update({
        entity_kind: "recommendation",
        entity_id: item.recommendation_id,
        entity_type: item.recommendation_type,
        status: "completed",
        notes: item.reason,
      });
      await loadData();
    } finally {
      setCompletingId(null);
    }
  }

  function handleGenerate(item) {
    navigate("/generate", {
      state: {
        prefill: {
          description: `${item.title}. ${item.description} ${item.reason}`.trim(),
          interests: item.contactName || "",
          sourceType: "recommendation",
          sourceTitle: item.title,
          contactName: item.contactName,
          recommendation: {
            id: item.recommendation_id,
            title: item.title,
            type: item.recommendation_type,
            reason: item.reason,
          },
        },
      },
    });
  }

  async function handleConvertToFollowUp(payload) {
    if (!followUpTarget) return;
    setSubmittingFollowUp(true);
    try {
      const result = await api.actionLifecycle.convertToFollowUp({
        entity_kind: "recommendation",
        entity_id: followUpTarget.recommendation_id,
        entity_type: followUpTarget.recommendation_type,
        ...payload,
        notes: followUpTarget.reason,
      });
      setFollowUps((current) => {
        const next = current.filter((followUp) => followUp.id !== result.follow_up.id);
        return [...next, result.follow_up];
      });
      setRecommendations((current) =>
        current.map((item) =>
          item.recommendation_id === followUpTarget.recommendation_id
            ? {
                ...item,
                lifecycle_status: result.lifecycle_state.status,
                converted_follow_up_id: result.converted_follow_up_id,
                lifecycle_updated_at: result.lifecycle_state.updated_at,
                related_follow_up_id: result.converted_follow_up_id,
              }
            : item
        )
      );
      setFollowUpTarget(null);
    } finally {
      setSubmittingFollowUp(false);
    }
  }

  async function handleFeedback(item, category) {
    if (!item?.recommendation_id) return;
    setFeedbackSubmittingId(item.recommendation_id);
    setFeedbackErrorByRecommendationId((current) => ({
      ...current,
      [item.recommendation_id]: "",
    }));
    try {
      await api.submitFeedback({
        suggestion: item.title,
        category,
        target_type: "recommendation",
        target_id: item.recommendation_id,
        notes: item.reason,
      });
      setFeedbackByRecommendationId((current) => ({
        ...current,
        [item.recommendation_id]: category,
      }));
      setFeedbackMessageByRecommendationId((current) => ({
        ...current,
        [item.recommendation_id]: "Feedback saved",
      }));
      window.setTimeout(() => {
        setFeedbackMessageByRecommendationId((current) => ({
          ...current,
          [item.recommendation_id]: "",
        }));
      }, 1600);
    } catch (err) {
      setFeedbackErrorByRecommendationId((current) => ({
        ...current,
        [item.recommendation_id]: err.message || "Could not save feedback right now.",
      }));
    } finally {
      setFeedbackSubmittingId(null);
    }
  }

const categoryOptions = [
    { value: "", label: "All categories" },
    { value: "Next Best Actions", label: "Next Best Actions" },
    { value: "Recommended Follow-ups", label: "Recommended Follow-ups" },
    { value: "Relationship Recovery Suggestions", label: "Relationship Recovery Suggestions" },
    { value: "High Value Connection Suggestions", label: "High Value Connection Suggestions" },
  ];

  const contactOptions = [
    { value: "", label: "All contacts" },
    ...contacts.map((contact) => ({ value: String(contact.id), label: contact.name })),
  ];

  const priorityOptions = [
    { value: "", label: "All priorities" },
    { value: "85", label: "85+" },
    { value: "70", label: "70+" },
    { value: "50", label: "50+" },
  ];

  const sortOptions = [
    { value: "priority_desc", label: "Priority high-low" },
    { value: "priority_asc", label: "Priority low-high" },
    { value: "relationship_desc", label: "Relationship score" },
    { value: "created_desc", label: "Newest first" },
    { value: "created_asc", label: "Oldest first" },
  ];

  const statusOptions = [
    { value: "", label: "All statuses" },
    { value: "accepted", label: "Accepted" },
    { value: "dismissed", label: "Dismissed" },
    { value: "completed", label: "Completed" },
    { value: "converted_to_follow_up", label: "Converted to follow-up" },
    { value: "pending", label: "Pending follow-up" },
    { value: "No linked follow-up", label: "No linked follow-up" },
  ];

  if (loading) {
    return (
      <div className="page-shell grid gap-4 lg:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell max-w-5xl">
        <ErrorState message={error} onRetry={loadData} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="page-shell"
    >
      <section className="page-header">
        <div className="page-header-copy">
          <p className="page-kicker">Action Engine</p>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-accent" />
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Recommendations</h1>
          </div>
          <p className="mt-3 text-sm leading-6 text-white/54">
            Rule-based relationship actions, grouped by follow-up urgency, recovery, and high-value growth.
          </p>
        </div>
      </section>

      <section className="glass filter-panel space-y-4">
        <div className="filter-grid xl:[grid-template-columns:minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search recommendations"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-accent/50"
            />
          </div>

          <CustomSelect
            value={category}
            onChange={setCategory}
            options={categoryOptions}
            placeholder="All categories"
            icon={Filter}
          />

          <CustomSelect
            value={contactFilter}
            onChange={setContactFilter}
            options={contactOptions}
            placeholder="All contacts"
          />

          <CustomSelect
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={priorityOptions}
            placeholder="All priorities"
          />

          <CustomSelect
            value={sortBy}
            onChange={setSortBy}
            options={sortOptions}
            placeholder="Priority high-low"
            icon={ArrowUpDown}
          />
        </div>

        <div className="filter-grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            placeholder="All statuses"
          />
          <div className="dense-meta-row rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-xs text-white/45">
            <span>{filteredRecommendations.length} recommendations</span>
            <span className="text-white/20">•</span>
            <span>{filteredRecommendations.filter((item) => item.priority_score >= 85).length} high priority</span>
            <span className="text-white/20">•</span>
            <span>{filteredRecommendations.filter((item) => item.related_contact_id).length} linked to contacts</span>
          </div>
        </div>
      </section>

      {filteredRecommendations.length === 0 ? (
        <div className="glass rounded-2xl">
          <EmptyState
            icon={Lightbulb}
            title="No recommendations match this view"
            description="Try clearing a filter or add more relationship activity to unlock new actions."
            actionLabel="Clear filters"
            onAction={() => {
              setQuery("");
              setCategory("");
              setContactFilter("");
              setPriorityFilter("");
              setStatusFilter("");
              setSortBy("priority_desc");
            }}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSections).map(([sectionTitle, items]) => (
            <section key={sectionTitle} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-medium uppercase tracking-wide text-white/55">{sectionTitle}</h2>
                <span className="text-xs text-white/35">{items.length}</span>
              </div>
              {items.length === 0 ? (
                <div className="compact-empty-panel rounded-2xl border border-dashed border-white/10 bg-white/[0.03]">
                  <div className="flex items-start gap-3">
                    <div className="empty-icon">
                      <Users2 className="h-4 w-4 text-white/45" />
                    </div>
                    <div className="empty-copy">
                      <p className="text-sm font-medium text-white">
                        {getRecommendationEmptyCopy(sectionTitle).title}
                      </p>
                      <p className="mt-1 text-sm text-white/45">
                        {getRecommendationEmptyCopy(sectionTitle).description}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {items.map((item) => (
                    <RecommendationCard
                      key={item.recommendation_id}
                      item={item}
                      contactName={item.contactName}
                      relationshipScore={item.relationshipScore}
                      lifecycleStatus={item.lifecycleStatus}
                      followUpStatusLabel={item.followUpStatusLabel}
                      onAccept={handleAccept}
                      onOpenContact={(contactId) => navigate(`/contacts/${contactId}`)}
                      onDismiss={handleDismiss}
                      onComplete={handleComplete}
                      onConvert={setFollowUpTarget}
                      onGenerate={handleGenerate}
                      onFeedback={handleFeedback}
                      accepting={acceptingId === item.recommendation_id}
                      dismissing={dismissingId === item.recommendation_id}
                      completing={completingId === item.recommendation_id}
                      feedbackSubmitting={feedbackSubmittingId === item.recommendation_id}
                      feedbackValue={feedbackByRecommendationId[item.recommendation_id] || ""}
                      feedbackMessage={feedbackMessageByRecommendationId[item.recommendation_id] || ""}
                      feedbackError={feedbackErrorByRecommendationId[item.recommendation_id] || ""}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <section className="glass rounded-2xl p-5 lg:p-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-accent" />
          <h2 className="text-base font-semibold text-white">How recommendation status works</h2>
        </div>
        <p className="text-sm text-white/55 max-w-3xl">
          Accept, dismiss, complete, and follow-up conversions update the live status of each recommendation so your
          workspace stays aligned with the actions you actually take.
        </p>
      </section>

      <Modal open={Boolean(followUpTarget)} onClose={() => setFollowUpTarget(null)} title="Convert to follow-up">
        {followUpTarget && (
          <FollowUpForm
            contactId={followUpTarget.related_contact_id || undefined}
            eventId={followUpTarget.related_event_id || undefined}
            initialValues={{
              title: followUpTarget.title,
              description: `${followUpTarget.description}\n\nReason: ${followUpTarget.reason}`.trim(),
            }}
            onSubmit={handleConvertToFollowUp}
            onCancel={() => setFollowUpTarget(null)}
            submitting={submittingFollowUp}
          />
        )}
      </Modal>
    </motion.div>
  );
}
