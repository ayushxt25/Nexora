import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  Lightbulb,
  Link2,
  Mail,
  MessageSquarePlus,
  Plus,
  Sparkles,
  Trash2,
  Users2,
} from "lucide-react";
import { useContactProfile } from "../hooks/useContactProfile";
import { api } from "../api/client";
import ScoreBadge from "../components/ui/ScoreBadge";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonCard, SkeletonLine } from "../components/ui/SkeletonLoader";
import Modal from "../components/ui/Modal";
import InteractionForm from "../components/domain/InteractionForm";
import FollowUpForm from "../components/domain/FollowUpForm";

function formatDate(value, options = { month: "short", day: "numeric", year: "numeric" }) {
  if (!value) return null;
  return new Intl.DateTimeFormat(undefined, options).format(new Date(value));
}

function priorityTone(score) {
  if (score >= 85) return "text-red-300 bg-red-500/10 border-red-500/20";
  if (score >= 70) return "text-amber-300 bg-amber-500/10 border-amber-500/20";
  return "text-emerald-300 bg-emerald-500/10 border-emerald-500/20";
}

function statusTone(status) {
  const normalized = (status || "").toLowerCase();
  if (["done", "completed", "complete", "closed"].includes(normalized)) {
    return "bg-emerald-500/12 text-emerald-300 border-emerald-500/20";
  }
  return "bg-white/5 text-white/65 border-white/10";
}

function SectionCard({ title, icon: Icon, actionLabel, onAction, children }) {
  return (
    <section className="glass rounded-2xl p-5 lg:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/5">
            <Icon className="h-4 w-4 text-accent" />
          </span>
          <h2 className="text-base font-semibold text-white">{title}</h2>
        </div>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white transition-colors"
          >
            {actionLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function InsightItem({ title, description, meta, badge, onClick }) {
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      onClick={onClick}
      className={`w-full rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3 text-left ${
        onClick ? "hover:bg-white/[0.06] transition-colors" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{title}</p>
          {description && <p className="mt-1 text-sm text-white/55">{description}</p>}
          {meta && <p className="mt-2 text-xs text-white/35">{meta}</p>}
        </div>
        {badge}
      </div>
    </Wrapper>
  );
}

export default function ContactProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    contact,
    scoreEntry,
    interactions,
    followUps,
    recommendations,
    opportunities,
    loading,
    error,
    refetch,
  } = useContactProfile(id);
  const [interactionModalOpen, setInteractionModalOpen] = useState(false);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleLogInteraction(payload) {
    setSubmitting(true);
    try {
      await api.interactions.create(payload);
      setInteractionModalOpen(false);
      refetch();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddFollowUp(payload) {
    setSubmitting(true);
    try {
      await api.followUps.create(payload);
      setFollowUpModalOpen(false);
      refetch();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!contact) return;
    if (!confirm(`Delete ${contact.name}? This can't be undone.`)) return;
    await api.contacts.remove(id);
    navigate("/contacts");
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        <SkeletonLine width="20%" height="1rem" />
        <SkeletonCard />
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorState message={error} onRetry={refetch} />
      </div>
    );
  }

  const score = scoreEntry?.score ?? null;
  const relationshipStrength = scoreEntry?.relationship_strength?.replaceAll("_", " ") || "Not available";
  const relationshipRisk = scoreEntry?.relationship_risk || "unknown";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6"
    >
      <button
        onClick={() => navigate("/contacts")}
        className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to contacts
      </button>

      <section className="glass rounded-2xl p-6 lg:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Users2 className="h-5 w-5 text-accent" />
                <h1 className="text-2xl lg:text-3xl font-semibold text-white">{contact.name}</h1>
              </div>
              {(contact.role || contact.company) && (
                <p className="mt-2 inline-flex items-center gap-2 text-sm text-white/50">
                  <Building2 className="h-4 w-4" />
                  {[contact.role, contact.company].filter(Boolean).join(" at ")}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-white/55">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {contact.email}
                </a>
              )}
              {contact.linkedin_url && (
                <a
                  href={contact.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  LinkedIn
                </a>
              )}
              <button
                onClick={() =>
                  navigate("/generate", {
                    state: {
                      prefill: {
                        description: `${contact.name}${contact.company ? ` from ${contact.company}` : ""}${contact.notes ? ` - ${contact.notes}` : ""}`,
                        interests: Array.isArray(contact.tags) ? contact.tags.join(", ") : "",
                        sourceType: "contact",
                        sourceTitle: contact.name,
                        contact: {
                          id: contact.id,
                          name: contact.name,
                          company: contact.company,
                          role: contact.role,
                          notes: contact.notes,
                          tags: contact.tags,
                          relationshipStrength: contact.relationship_strength,
                        },
                      },
                    },
                  })
                }
                className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/12 px-3 py-1.5 text-accent hover:bg-accent/20 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Open AI prep
              </button>
            </div>

            {Array.isArray(contact.tags) && contact.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {contact.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {contact.notes && (
              <p className="max-w-3xl text-sm leading-7 text-white/72">
                {contact.notes}
              </p>
            )}
          </div>

          <div className="min-w-full xl:min-w-[320px] space-y-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/35">Relationship score</p>
                  <p className="mt-2 text-sm text-white/55 capitalize">
                    {relationshipStrength} • {relationshipRisk} risk
                  </p>
                </div>
                <ScoreBadge score={score} />
              </div>
              {scoreEntry?.factors && (
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/45">
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                    Interaction {Math.round(scoreEntry.factors.interaction_score)}
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                    Recency {Math.round(scoreEntry.factors.recency_score)}
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                    Graph {Math.round(scoreEntry.factors.graph_score)}
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                    Overlap {Math.round(scoreEntry.factors.interest_overlap_score)}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setInteractionModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
              >
                <MessageSquarePlus className="h-4 w-4" />
                Log interaction
              </button>
              <button
                onClick={() => setFollowUpModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add follow-up
              </button>
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2 text-sm font-medium text-red-300 hover:bg-red-500/15 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Interaction Timeline" icon={CalendarClock}>
          {interactions.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="No interactions yet"
              description="Use the real interaction endpoint to log meetings, emails, calls, and messages for this relationship."
              actionLabel="Log interaction"
              onAction={() => setInteractionModalOpen(true)}
            />
          ) : (
            <div className="space-y-3">
              {interactions.map((interaction) => (
                <div
                  key={interaction.id}
                  className="rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white capitalize">
                      {interaction.interaction_type.replaceAll("_", " ")}
                    </p>
                    <span className="text-xs text-white/35">{formatDate(interaction.created_at)}</span>
                  </div>
                  {interaction.notes && <p className="mt-2 text-sm text-white/60">{interaction.notes}</p>}
                  {interaction.sentiment && (
                    <p className="mt-2 text-xs uppercase tracking-wide text-white/35">
                      Sentiment: {interaction.sentiment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Follow-Ups" icon={CheckCircle2} actionLabel="Add" onAction={() => setFollowUpModalOpen(true)}>
          {followUps.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No follow-ups"
              description="There are no scheduled follow-ups for this contact yet."
              actionLabel="Add follow-up"
              onAction={() => setFollowUpModalOpen(true)}
            />
          ) : (
            <div className="space-y-3">
              {followUps.map((followUp) => (
                <div
                  key={followUp.id}
                  className="rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{followUp.title}</p>
                      {followUp.description && (
                        <p className="mt-1 text-sm text-white/55">{followUp.description}</p>
                      )}
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusTone(
                        followUp.status
                      )}`}
                    >
                      {followUp.status}
                    </span>
                  </div>
                  {followUp.due_date && (
                    <p className="mt-2 text-xs text-white/35">Due {formatDate(followUp.due_date)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Related Recommendations" icon={Lightbulb}>
          {recommendations.length === 0 ? (
            <EmptyState
              icon={Lightbulb}
              title="No recommendations for this contact"
              description="The backend only shows recommendation items when the scoring engine has enough contact context."
            />
          ) : (
            <div className="space-y-3">
              {recommendations.map((item) => (
                <InsightItem
                  key={item.recommendation_id}
                  title={item.title}
                  description={item.description}
                  meta={item.reason}
                  badge={
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${priorityTone(
                        item.priority_score
                      )}`}
                    >
                      {Math.round(item.priority_score)}
                    </span>
                  }
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Related Opportunities" icon={Sparkles}>
          {opportunities.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No opportunities linked to this contact"
              description="Opportunity cards only appear when the backend detects a concrete next move involving this relationship."
            />
          ) : (
            <div className="space-y-3">
              {opportunities.map((item) => (
                <InsightItem
                  key={item.opportunity_id}
                  title={item.title}
                  description={item.recommended_action}
                  meta={`${item.reason} • ${item.urgency} urgency`}
                  badge={
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${priorityTone(
                        item.priority_score
                      )}`}
                    >
                      {Math.round(item.priority_score)}
                    </span>
                  }
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <section className="glass rounded-2xl p-5 lg:p-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-accent" />
          <h2 className="text-base font-semibold text-white">AI preparation actions</h2>
        </div>
        <p className="text-sm text-white/55 max-w-3xl">
          The backend currently supports the generic conversation generator and event/theme analysis flows, not a
          dedicated contact-prep endpoint. This profile links into the real AI generation page using this contact’s
          notes and tags when available.
        </p>
        <button
          onClick={() =>
            navigate("/generate", {
              state: {
                prefill: {
                  description: `${contact.name}${contact.company ? ` from ${contact.company}` : ""}${contact.notes ? ` - ${contact.notes}` : ""}`,
                  interests: Array.isArray(contact.tags) ? contact.tags.join(", ") : "",
                  sourceType: "contact",
                  sourceTitle: contact.name,
                  contact: {
                    id: contact.id,
                    name: contact.name,
                    company: contact.company,
                    role: contact.role,
                    notes: contact.notes,
                    tags: contact.tags,
                    relationshipStrength: contact.relationship_strength,
                  },
                },
              },
            })
          }
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          Open AI prep
        </button>
      </section>

      <Modal open={interactionModalOpen} onClose={() => setInteractionModalOpen(false)} title="Log interaction">
        <InteractionForm
          contactId={Number(id)}
          onSubmit={handleLogInteraction}
          onCancel={() => setInteractionModalOpen(false)}
          submitting={submitting}
        />
      </Modal>

      <Modal open={followUpModalOpen} onClose={() => setFollowUpModalOpen(false)} title="Add follow-up">
        <FollowUpForm
          contactId={Number(id)}
          onSubmit={handleAddFollowUp}
          onCancel={() => setFollowUpModalOpen(false)}
          submitting={submitting}
        />
      </Modal>
    </motion.div>
  );
}
