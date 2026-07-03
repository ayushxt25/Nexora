import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowUpDown,
  CalendarClock,
  Filter,
  Plus,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
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
import { MiniBarChart } from "../components/ui/SimpleCharts";

function formatDate(value) {
  if (!value) return "No recent interaction";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function activityBucket(count) {
  if (count >= 5) return "high";
  if (count >= 2) return "medium";
  return "low";
}

function scoreRangeLabel(score) {
  if (score >= 80) return "80-100";
  if (score >= 60) return "60-79";
  if (score >= 40) return "40-59";
  return "0-39";
}

function sortScores(items, sortBy) {
  const next = [...items];
  next.sort((a, b) => {
    switch (sortBy) {
      case "score_asc":
        return a.score - b.score;
      case "recent_activity":
        return (b.interactionCount || 0) - (a.interactionCount || 0);
      case "opportunity_count":
        return (b.recommendationCount || 0) - (a.recommendationCount || 0);
      case "trend_direction":
        return (b.factors.recency_score || 0) - (a.factors.recency_score || 0);
      case "score_desc":
      default:
        return b.score - a.score;
    }
  });
  return next;
}

function InsightCard({ title, subtitle, icon: Icon, children }) {
  return (
    <section className="glass min-w-0 overflow-hidden rounded-2xl p-5 lg:p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/5">
          <Icon className="h-4 w-4 text-accent" />
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

const categoryOptions = [
  { value: "", label: "All categories" },
  { value: "weak", label: "Weak" },
  { value: "developing", label: "Developing" },
  { value: "healthy", label: "Healthy" },
  { value: "strong", label: "Strong" },
  { value: "strategic", label: "Strategic" },
  { value: "high", label: "High risk" },
  { value: "medium", label: "Medium risk" },
  { value: "low", label: "Low risk" },
];

const scoreRangeOptions = [
  { value: "", label: "All score ranges" },
  { value: "80-100", label: "80-100" },
  { value: "60-79", label: "60-79" },
  { value: "40-59", label: "40-59" },
  { value: "0-39", label: "0-39" },
];

const activityOptions = [
  { value: "", label: "All activity levels" },
  { value: "high", label: "High activity" },
  { value: "medium", label: "Medium activity" },
  { value: "low", label: "Low activity" },
];

const dateRangeOptions = [
  { value: "all", label: "All time" },
  { value: "30d", label: "Last 30d" },
  { value: "90d", label: "Last 90d" },
];

const sortOptions = [
  { value: "score_desc", label: "Score high-low" },
  { value: "score_asc", label: "Score low-high" },
  { value: "trend_direction", label: "Recency trend" },
  { value: "recent_activity", label: "Recent activity" },
  { value: "opportunity_count", label: "Recommendation count" },
];

export default function RelationshipScores() {
  const navigate = useNavigate();
  const [scores, setScores] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [scoreRange, setScoreRange] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [sortBy, setSortBy] = useState("score_desc");
  const [selectedId, setSelectedId] = useState(null);
  const [followUpTarget, setFollowUpTarget] = useState(null);
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [scoresData, contactsData, interactionsData, recommendationsData] = await Promise.all([
        api.relationshipScores.list(),
        api.contacts.list({ limit: 100, sort_by: "name", sort_order: "asc" }).catch(() => []),
        api.interactions.list({ limit: 100, sort_order: "desc" }).catch(() => []),
        api.recommendations.list({ limit: 100, sort_by: "priority_score", sort_order: "desc" }).catch(() => []),
      ]);
      setScores(scoresData?.scores || []);
      setContacts(contactsData || []);
      setInteractions(interactionsData || []);
      setRecommendations(recommendationsData || []);
    } catch (err) {
      setError(err.message || "Failed to load relationship scores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const interactionSummary = useMemo(() => {
    const map = new Map();
    const now = new Date();
    const rangeCutoff =
      dateRange === "30d"
        ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        : dateRange === "90d"
          ? new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          : null;

    for (const interaction of interactions) {
      if (!interaction.contact_id) continue;
      const createdAt = interaction.created_at ? new Date(interaction.created_at) : null;
      if (rangeCutoff && createdAt && createdAt < rangeCutoff) continue;
      const existing = map.get(interaction.contact_id) || {
        count: 0,
        lastInteractionAt: null,
      };
      existing.count += 1;
      if (!existing.lastInteractionAt || (createdAt && createdAt > new Date(existing.lastInteractionAt))) {
        existing.lastInteractionAt = interaction.created_at;
      }
      map.set(interaction.contact_id, existing);
    }

    return map;
  }, [dateRange, interactions]);

  const recommendationSummary = useMemo(() => {
    const map = new Map();
    for (const recommendation of recommendations) {
      if (!recommendation.related_contact_id) continue;
      map.set(
        recommendation.related_contact_id,
        (map.get(recommendation.related_contact_id) || 0) + 1
      );
    }
    return map;
  }, [recommendations]);

  const enrichedScores = useMemo(() => {
    const contactMap = new Map(contacts.map((contact) => [contact.id, contact]));
    return scores.map((item) => ({
      ...item,
      contact: contactMap.get(item.contact_id) || null,
      interactionCount: interactionSummary.get(item.contact_id)?.count || 0,
      lastInteractionAt: interactionSummary.get(item.contact_id)?.lastInteractionAt || null,
      recommendationCount: recommendationSummary.get(item.contact_id) || 0,
      activityLevel: activityBucket(interactionSummary.get(item.contact_id)?.count || 0),
      scoreRange: scoreRangeLabel(item.score),
    }));
  }, [contacts, interactionSummary, recommendationSummary, scores]);

  const filteredScores = useMemo(() => {
    let items = enrichedScores;

    if (query.trim()) {
      const search = query.trim().toLowerCase();
      items = items.filter((item) =>
        [item.name, item.contact?.company, item.contact?.role, item.relationship_strength, item.relationship_risk]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(search))
      );
    }
    if (category) {
      items = items.filter(
        (item) =>
          item.relationship_strength === category ||
          item.relationship_risk === category
      );
    }
    if (scoreRange) {
      items = items.filter((item) => item.scoreRange === scoreRange);
    }
    if (activityLevel) {
      items = items.filter((item) => item.activityLevel === activityLevel);
    }

    return sortScores(items, sortBy);
  }, [activityLevel, category, enrichedScores, query, scoreRange, sortBy]);

  const selectedScore = useMemo(() => {
    return filteredScores.find((item) => item.contact_id === selectedId) || filteredScores[0] || null;
  }, [filteredScores, selectedId]);

  useEffect(() => {
    if (selectedScore && selectedId !== selectedScore.contact_id) {
      setSelectedId(selectedScore.contact_id);
    }
  }, [selectedId, selectedScore]);

  const topRelationships = filteredScores.slice(0, 5);
  const needingAttention = filteredScores
    .filter((item) => item.relationship_risk === "high" || item.score < 50)
    .slice(0, 5);

  const recommendationMap = useMemo(() => {
    const map = new Map();
    for (const recommendation of recommendations) {
      if (!recommendation.related_contact_id) continue;
      const items = map.get(recommendation.related_contact_id) || [];
      items.push(recommendation);
      map.set(recommendation.related_contact_id, items);
    }
    return map;
  }, [recommendations]);

  const scoreDistribution = useMemo(() => {
    const buckets = ["80-100", "60-79", "40-59", "0-39"];
    return buckets.map((label) => ({
      label,
      value: filteredScores.filter((item) => item.scoreRange === label).length,
    }));
  }, [filteredScores]);

  async function handleCreateFollowUp(payload) {
    setSubmittingFollowUp(true);
    try {
      await api.followUps.create(payload);
      setFollowUpTarget(null);
    } finally {
      setSubmittingFollowUp(false);
    }
  }

  function handleGenerate(item) {
    navigate("/generate", {
      state: {
        prefill: {
          description: `${item.name}${item.contact?.company ? ` at ${item.contact.company}` : ""}${item.contact?.notes ? ` - ${item.contact.notes}` : ""}`,
          interests: Array.isArray(item.contact?.tags) ? item.contact.tags.join(", ") : "",
        },
      },
    });
  }

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
        <div className="hero-panel px-5 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
          <p className="page-kicker">Relationship Scoring</p>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Relationship Scores</h1>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/54">
            Explore high-value connections, risk signals, and score factor explanations from the real scoring engine.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white/60">
              Explainable factors
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white/60">
              Real scoring only
            </span>
          </div>
        </div>
      </section>

      <section className="glass filter-panel space-y-4">
        <div className="filter-grid xl:[grid-template-columns:minmax(0,1.5fr)_repeat(4,minmax(0,1fr))]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search relationships"
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
            value={scoreRange}
            onChange={setScoreRange}
            options={scoreRangeOptions}
            placeholder="All score ranges"
          />

          <CustomSelect
            value={activityLevel}
            onChange={setActivityLevel}
            options={activityOptions}
            placeholder="All activity levels"
          />

          <div className="grid gap-2 md:grid-cols-2">
            <CustomSelect
              value={dateRange}
              onChange={setDateRange}
              options={dateRangeOptions}
              placeholder="All time"
            />
            <CustomSelect
              value={sortBy}
              onChange={setSortBy}
              options={sortOptions}
              placeholder="Score high-low"
              icon={ArrowUpDown}
            />
          </div>
        </div>
      </section>

      {filteredScores.length === 0 ? (
        <div className="glass rounded-2xl">
          <EmptyState
            icon={Users2}
            title="No relationships match this view"
            description="Try clearing one or more filters, or log more relationship activity to build scoring coverage."
            actionLabel="Clear filters"
            onAction={() => {
              setQuery("");
              setCategory("");
              setScoreRange("");
              setActivityLevel("");
              setDateRange("all");
              setSortBy("score_desc");
            }}
          />
        </div>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <InsightCard title="Top relationships" subtitle="Highest-scoring current relationships." icon={TrendingUp}>
              <div className="space-y-3">
                {topRelationships.map((item) => (
                  <button
                    key={item.contact_id}
                    onClick={() => setSelectedId(item.contact_id)}
                    className={`interactive-card w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                      selectedScore?.contact_id === item.contact_id
                        ? "border-accent/30 bg-accent/10"
                        : "border-white/6 bg-white/[0.03] hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{item.name}</p>
                        <p className="mt-1 text-xs text-white/40">
                          {item.contact?.company || "No company"} • {formatDate(item.lastInteractionAt)}
                        </p>
                      </div>
                      <ScoreBadge score={item.score} size="sm" />
                    </div>
                  </button>
                ))}
              </div>
            </InsightCard>

            <InsightCard
              title="Relationships needing attention"
              subtitle="Low-score or high-risk relationships with action paths."
              icon={TrendingDown}
            >
              {needingAttention.length === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title="No relationships currently need attention"
                  description="The backend scoring model is not flagging any high-risk or low-score relationships right now."
                />
              ) : (
                <div className="space-y-3">
                  {needingAttention.map((item) => (
                    <div key={item.contact_id} className="rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">{item.name}</p>
                          <p className="mt-1 text-xs text-white/40 capitalize">
                            {item.relationship_risk} risk • {item.recommendationCount} linked recommendations
                          </p>
                        </div>
                        <ScoreBadge score={item.score} size="sm" />
                      </div>
                      <div className="action-cluster mt-3">
                        <button
                          onClick={() => navigate(`/contacts/${item.contact_id}`)}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          Open contact
                        </button>
                        <button
                          onClick={() => setFollowUpTarget(item)}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          Create follow-up
                        </button>
                        <button
                          onClick={() => handleGenerate(item)}
                          className="inline-flex items-center gap-2 rounded-xl border border-accent/25 bg-accent/12 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/20 transition-colors"
                        >
                          <Sparkles className="h-4 w-4" />
                          Generate prep
                        </button>
                        <button
                          onClick={() => navigate("/recommendations")}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          Jump to recommendations
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </InsightCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <InsightCard title="Relationship score trends" subtitle="Historical score series are not exposed yet." icon={CalendarClock}>
              <EmptyState
                icon={CalendarClock}
                title="Historical score trends unavailable"
                description="The backend returns current relationship scores and factor breakdowns, but not time-series score history. Recent activity filters above use real interaction timestamps instead."
              />
            </InsightCard>

            <InsightCard title="Relationship distribution" subtitle="Current score buckets from real score output." icon={TrendingUp}>
              <MiniBarChart data={scoreDistribution} />
            </InsightCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <InsightCard title="Relationship score breakdown" subtitle="Factor-level contribution for the selected relationship." icon={TrendingUp}>
              {selectedScore ? (
                <MiniBarChart
                  data={[
                    { label: "Interaction", value: Math.round(selectedScore.factors.interaction_score) },
                    { label: "Recency", value: Math.round(selectedScore.factors.recency_score) },
                    { label: "Graph", value: Math.round(selectedScore.factors.graph_score) },
                    { label: "Recommendations", value: Math.round(selectedScore.factors.recommendation_score) },
                    { label: "Interest overlap", value: Math.round(selectedScore.factors.interest_overlap_score) },
                  ]}
                />
              ) : (
                <EmptyState title="Select a relationship" description="Choose a relationship to inspect its factor breakdown." />
              )}
            </InsightCard>

            <InsightCard title="Score explanation panel" subtitle="Why this relationship is scoring where it is." icon={Users2}>
              {selectedScore ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{selectedScore.name}</p>
                        <p className="mt-1 text-xs text-white/40 capitalize">
                          {selectedScore.relationship_strength} • {selectedScore.relationship_risk} risk
                        </p>
                      </div>
                      <ScoreBadge score={selectedScore.score} />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-white/35">Recent activity</p>
                      <p className="mt-2 text-sm text-white/70">
                        {selectedScore.interactionCount} interactions • {formatDate(selectedScore.lastInteractionAt)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-white/35">Suggested next steps</p>
                      <p className="mt-2 text-sm text-white/70">
                        {recommendationMap.get(selectedScore.contact_id)?.length || 0} linked recommendation items
                      </p>
                    </div>
                  </div>
                  {(recommendationMap.get(selectedScore.contact_id) || []).slice(0, 2).map((item) => (
                    <div key={item.recommendation_id} className="rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3">
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="mt-1 text-sm text-white/55">{item.reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No selected relationship" description="Pick a relationship from the ranked list to inspect it." />
              )}
            </InsightCard>
          </div>
        </>
      )}

      <Modal open={Boolean(followUpTarget)} onClose={() => setFollowUpTarget(null)} title="Create follow-up">
        {followUpTarget && (
          <FollowUpForm
            contactId={followUpTarget.contact_id}
            initialValues={{
              title: `Reconnect with ${followUpTarget.name}`,
              description: `Relationship score is ${Math.round(followUpTarget.score)} with ${followUpTarget.relationship_risk} risk.`,
            }}
            onSubmit={handleCreateFollowUp}
            onCancel={() => setFollowUpTarget(null)}
            submitting={submittingFollowUp}
          />
        )}
      </Modal>
    </motion.div>
  );
}
