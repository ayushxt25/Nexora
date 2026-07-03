import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarClock,
  Filter,
  Network,
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

const CLUSTER_COLORS = ["#7c5cff", "#22d3ee", "#22c55e", "#f59e0b", "#ef4444", "#14b8a6"];

function scoreBucket(score) {
  if (score >= 80) return "80-100";
  if (score >= 60) return "60-79";
  if (score >= 40) return "40-59";
  return "0-39";
}

function activityBucket(value) {
  if (value >= 3) return "high";
  if (value >= 1) return "medium";
  return "low";
}

function getStrengthLabel(contactId, graph, scoreMap) {
  if (graph.strongIds.has(contactId)) return "strong";
  if (graph.weakIds.has(contactId)) return "weak";
  const score = scoreMap.get(contactId)?.score ?? 0;
  if (score >= 80) return "strong";
  if (score < 50) return "weak";
  return "developing";
}

function getContactReason(contactId, graph) {
  return (
    graph.bridgeReasonMap.get(contactId) ||
    graph.strongReasonMap.get(contactId) ||
    graph.weakReasonMap.get(contactId) ||
    graph.isolatedReasonMap.get(contactId) ||
    "Graph insight available"
  );
}

function buildGraphNodes(graph, contacts, scores) {
  const scoreMap = new Map(scores.map((score) => [score.contact_id, score]));
  const contactMap = new Map(contacts.map((contact) => [contact.id, contact]));
  const clusterLookup = new Map();

  graph.clusters.forEach((cluster, clusterIndex) => {
    cluster.contact_ids.forEach((contactId) => {
      clusterLookup.set(contactId, {
        clusterId: cluster.cluster_id,
        clusterIndex,
        sharedSignals: cluster.shared_signals,
        memberNames: cluster.contact_names,
      });
    });
  });

  const baseNodes = graph.centrality_scores.map((entry, index) => {
    const clusterInfo = clusterLookup.get(entry.contact_id);
    const score = scoreMap.get(entry.contact_id) || null;
    const contact = contactMap.get(entry.contact_id) || null;
    const strengthLabel = getStrengthLabel(entry.contact_id, graph, scoreMap);
    const activityLevel = activityBucket(entry.interaction_count || 0);
    return {
      id: entry.contact_id,
      name: entry.name,
      contact,
      score,
      centralityScore: entry.centrality_score,
      interactionCount: entry.interaction_count,
      sharedSignalCount: entry.shared_signal_count,
      clusterInfo,
      strengthLabel,
      activityLevel,
      scoreRange: scoreBucket(score?.score ?? 0),
      reason: getContactReason(entry.contact_id, graph),
      order: index,
    };
  });

  const seen = new Set(baseNodes.map((node) => node.id));
  const extraInsightEntries = [
    ...graph.weak_tie_candidates,
    ...graph.strong_tie_contacts,
    ...graph.bridge_contacts,
    ...graph.isolated_contacts,
  ];

  extraInsightEntries.forEach((entry) => {
    if (seen.has(entry.contact_id)) return;
    const contact = contactMap.get(entry.contact_id) || null;
    const score = scoreMap.get(entry.contact_id) || null;
    baseNodes.push({
      id: entry.contact_id,
      name: entry.name,
      contact,
      score,
      centralityScore: 0,
      interactionCount: 0,
      sharedSignalCount: 0,
      clusterInfo: clusterLookup.get(entry.contact_id),
      strengthLabel: getStrengthLabel(entry.contact_id, graph, scoreMap),
      activityLevel: "low",
      scoreRange: scoreBucket(score?.score ?? 0),
      reason: entry.reason,
      order: baseNodes.length,
    });
    seen.add(entry.contact_id);
  });

  return baseNodes;
}

function computeNodePositions(nodes) {
  const width = 900;
  const height = 520;
  const positioned = [];
  const clustered = new Map();
  const unclustered = [];

  nodes.forEach((node) => {
    if (node.clusterInfo) {
      const key = node.clusterInfo.clusterId;
      const list = clustered.get(key) || [];
      list.push(node);
      clustered.set(key, list);
    } else {
      unclustered.push(node);
    }
  });

  const clusterEntries = Array.from(clustered.entries());
  const totalGroups = Math.max(clusterEntries.length + (unclustered.length ? 1 : 0), 1);
  const centerY = height / 2;
  const spacingX = width / (totalGroups + 1);

  clusterEntries.forEach(([clusterId, clusterNodes], clusterIdx) => {
    const centerX = spacingX * (clusterIdx + 1);
    const radius = 52 + clusterNodes.length * 8;
    clusterNodes.forEach((node, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(clusterNodes.length, 1);
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      positioned.push({
        ...node,
        x,
        y,
        color: CLUSTER_COLORS[clusterIdx % CLUSTER_COLORS.length],
      });
    });
  });

  if (unclustered.length) {
    const startX = spacingX * (clusterEntries.length + 1);
    unclustered.forEach((node, index) => {
      positioned.push({
        ...node,
        x: startX + (index % 2) * 90,
        y: 120 + index * 80,
        color: "#64748b",
      });
    });
  }

  return { nodes: positioned, width, height };
}

function hasGraphStructure(graph, nodes) {
  if (!graph || nodes.length === 0) return false;
  if (nodes.length <= 1) return false;
  return (
    (graph.clusters?.length || 0) > 0 ||
    (graph.strong_tie_contacts?.length || 0) > 0 ||
    (graph.weak_tie_candidates?.length || 0) > 0 ||
    (graph.bridge_contacts?.length || 0) > 0 ||
    (graph.isolated_contacts?.length || 0) > 0
  );
}

function GraphCanvas({ nodes, selectedId, hoveredId, onHover, onLeave, onSelect }) {
  if (!nodes.length) {
    return <p className="text-sm text-white/35">No graph nodes available.</p>;
  }

  const { nodes: positioned, width, height } = computeNodePositions(nodes);

  return (
    <div className="chart-frame overflow-x-auto rounded-2xl border border-white/6 bg-white/[0.03] p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[320px] min-w-[680px] w-full sm:h-[380px] lg:h-[420px]">
        {Array.from(
          positioned
            .filter((node) => node.clusterInfo)
            .reduce((acc, node) => {
              const key = node.clusterInfo.clusterId;
              const list = acc.get(key) || [];
              list.push(node);
              acc.set(key, list);
              return acc;
            }, new Map())
        ).map(([clusterId, clusterNodes], clusterIndex) => {
          const avgX = clusterNodes.reduce((sum, node) => sum + node.x, 0) / clusterNodes.length;
          const avgY = clusterNodes.reduce((sum, node) => sum + node.y, 0) / clusterNodes.length;
          const radius = 90 + clusterNodes.length * 10;
          return (
            <g key={clusterId}>
              <circle
                cx={avgX}
                cy={avgY}
                r={radius}
                fill={`${CLUSTER_COLORS[clusterIndex % CLUSTER_COLORS.length]}12`}
                stroke={`${CLUSTER_COLORS[clusterIndex % CLUSTER_COLORS.length]}55`}
                strokeDasharray="6 8"
              />
            </g>
          );
        })}

        {positioned.map((node) => {
          const scoreValue = node.score?.score ?? 35;
          const radius = 14 + Math.max(0, Math.min(scoreValue, 100)) / 9;
          const active = selectedId === node.id || hoveredId === node.id;
          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onMouseEnter={() => onHover(node.id)}
              onMouseLeave={onLeave}
              onClick={() => onSelect(node.id)}
              className="cursor-pointer"
            >
              <motion.circle
                initial={{ r: 0, opacity: 0 }}
                animate={{ r: radius, opacity: 1 }}
                transition={{ duration: 0.25 }}
                fill={node.color}
                fillOpacity={active ? 0.28 : 0.16}
                stroke={node.color}
                strokeWidth={active ? 3 : 1.5}
              />
              <circle r={4.5} fill={node.color} />
              <text
                x={0}
                y={radius + 16}
                textAnchor="middle"
                className="fill-white/75 text-[11px] font-medium"
              >
                {node.name.length > 12 ? `${node.name.slice(0, 12)}...` : node.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
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

const scoreRangeOptions = [
  { value: "", label: "All score ranges" },
  { value: "80-100", label: "80-100" },
  { value: "60-79", label: "60-79" },
  { value: "40-59", label: "40-59" },
  { value: "0-39", label: "0-39" },
];

const activityLevelOptions = [
  { value: "", label: "All activity levels" },
  { value: "high", label: "High activity" },
  { value: "medium", label: "Medium activity" },
  { value: "low", label: "Low activity" },
];

const relationshipStrengthOptions = [
  { value: "", label: "All relationship strength" },
  { value: "strong", label: "Strong" },
  { value: "developing", label: "Developing" },
  { value: "weak", label: "Weak" },
];

export default function NetworkGraph() {
  const navigate = useNavigate();
  const [graph, setGraph] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [scoreRange, setScoreRange] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [relationshipStrength, setRelationshipStrength] = useState("");
  const [clusterFilter, setClusterFilter] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [followUpTarget, setFollowUpTarget] = useState(null);
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [graphData, contactsData, scoresData] = await Promise.all([
        api.network.graphInsights(),
        api.contacts.list({ limit: 100, sort_by: "name", sort_order: "asc" }).catch(() => []),
        api.relationshipScores.list().catch(() => ({ scores: [] })),
      ]);
      const graphMeta = {
        ...graphData,
        strongIds: new Set((graphData.strong_tie_contacts || []).map((item) => item.contact_id)),
        weakIds: new Set((graphData.weak_tie_candidates || []).map((item) => item.contact_id)),
        bridgeIds: new Set((graphData.bridge_contacts || []).map((item) => item.contact_id)),
        isolatedIds: new Set((graphData.isolated_contacts || []).map((item) => item.contact_id)),
        strongReasonMap: new Map((graphData.strong_tie_contacts || []).map((item) => [item.contact_id, item.reason])),
        weakReasonMap: new Map((graphData.weak_tie_candidates || []).map((item) => [item.contact_id, item.reason])),
        bridgeReasonMap: new Map((graphData.bridge_contacts || []).map((item) => [item.contact_id, item.reason])),
        isolatedReasonMap: new Map((graphData.isolated_contacts || []).map((item) => [item.contact_id, item.reason])),
      };
      setGraph(graphMeta);
      setContacts(contactsData || []);
      setScores(scoresData?.scores || []);
    } catch (err) {
      setError(err.message || "Failed to load network graph.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const graphNodes = useMemo(() => {
    if (!graph) return [];
    return buildGraphNodes(graph, contacts, scores);
  }, [contacts, graph, scores]);

  const clusterOptions = useMemo(
    () => (graph?.clusters || []).map((cluster) => ({ id: cluster.cluster_id, label: cluster.shared_signals.join(", ") || cluster.cluster_id })),
    [graph]
  );

  const clusterSelectOptions = useMemo(
    () => [{ value: "", label: "All clusters" }, ...clusterOptions.map((cluster) => ({ value: cluster.id, label: cluster.label }))],
    [clusterOptions]
  );

  const filteredNodes = useMemo(() => {
    let nodes = graphNodes;

    if (query.trim()) {
      const search = query.trim().toLowerCase();
      nodes = nodes.filter((node) =>
        [node.name, node.contact?.company, node.contact?.role, node.reason]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(search))
      );
    }
    if (scoreRange) {
      nodes = nodes.filter((node) => node.scoreRange === scoreRange);
    }
    if (activityLevel) {
      nodes = nodes.filter((node) => node.activityLevel === activityLevel);
    }
    if (relationshipStrength) {
      nodes = nodes.filter((node) => node.strengthLabel === relationshipStrength);
    }
    if (clusterFilter) {
      nodes = nodes.filter((node) => node.clusterInfo?.clusterId === clusterFilter);
    }

    return nodes;
  }, [activityLevel, clusterFilter, graphNodes, query, relationshipStrength, scoreRange]);

  const selectedNode = useMemo(
    () => filteredNodes.find((node) => node.id === selectedId) || filteredNodes[0] || null,
    [filteredNodes, selectedId]
  );
  const hasVisualGraph = useMemo(() => hasGraphStructure(graph, filteredNodes), [graph, filteredNodes]);

  useEffect(() => {
    if (selectedNode && selectedId !== selectedNode.id) {
      setSelectedId(selectedNode.id);
    }
  }, [selectedId, selectedNode]);

  async function handleCreateFollowUp(payload) {
    setSubmittingFollowUp(true);
    try {
      await api.followUps.create(payload);
      setFollowUpTarget(null);
    } finally {
      setSubmittingFollowUp(false);
    }
  }

  function handleGenerate(node) {
    navigate("/generate", {
      state: {
        prefill: {
          description: `${node.name}${node.contact?.company ? ` at ${node.contact.company}` : ""}${node.contact?.notes ? ` - ${node.contact.notes}` : ""}`,
          interests: Array.isArray(node.contact?.tags) ? node.contact.tags.join(", ") : "",
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
          <p className="page-kicker">Graph Intelligence</p>
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-accent" />
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Network Graph</h1>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/54">
            Explore strong ties, bridge contacts, isolated nodes, and relationship clusters from the backend graph intelligence layer.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white/60">
              Real nodes only
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white/60">
              No invented edges
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white/60">
              Backend graph-derived signals
            </span>
          </div>
        </div>
      </section>

      <section className="glass filter-panel space-y-4">
        <div className="filter-grid xl:[grid-template-columns:minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search graph contacts"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-accent/50"
            />
          </div>

          <CustomSelect
            value={scoreRange}
            onChange={setScoreRange}
            options={scoreRangeOptions}
            placeholder="All score ranges"
            icon={Filter}
          />

          <CustomSelect
            value={activityLevel}
            onChange={setActivityLevel}
            options={activityLevelOptions}
            placeholder="All activity levels"
          />

          <CustomSelect
            value={relationshipStrength}
            onChange={setRelationshipStrength}
            options={relationshipStrengthOptions}
            placeholder="All relationship strength"
          />

          <CustomSelect
            value={clusterFilter}
            onChange={setClusterFilter}
            options={clusterSelectOptions}
            placeholder="All clusters"
          />
        </div>
      </section>

      {!filteredNodes.length ? (
        <div className="glass rounded-2xl">
          <EmptyState
            icon={Network}
            title="No graph nodes match this view"
            description="Try clearing filters or add more contact activity so the backend can enrich graph coverage."
            actionLabel="Clear filters"
            onAction={() => {
              setQuery("");
              setScoreRange("");
              setActivityLevel("");
              setRelationshipStrength("");
              setClusterFilter("");
            }}
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="glass rounded-2xl p-4">
              <p className="text-sm text-white/45">Contacts</p>
              <p className="mt-2 text-2xl font-semibold text-white">{graph?.total_contacts ?? 0}</p>
            </div>
            <div className="glass rounded-2xl p-4">
              <p className="text-sm text-white/45">Density</p>
              <p className="mt-2 text-2xl font-semibold text-white">{(graph?.network_density_estimate ?? 0).toFixed(2)}</p>
            </div>
            <div className="glass rounded-2xl p-4">
              <p className="text-sm text-white/45">Strong ties</p>
              <p className="mt-2 text-2xl font-semibold text-white">{graph?.strong_tie_contacts?.length ?? 0}</p>
            </div>
            <div className="glass rounded-2xl p-4">
              <p className="text-sm text-white/45">Bridge contacts</p>
              <p className="mt-2 text-2xl font-semibold text-white">{graph?.bridge_contacts?.length ?? 0}</p>
            </div>
            <div className="glass rounded-2xl p-4">
              <p className="text-sm text-white/45">Clusters</p>
              <p className="mt-2 text-2xl font-semibold text-white">{graph?.clusters?.length ?? 0}</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <InsightCard
              title="Graph visualization"
              subtitle="Node size reflects relationship score. Cluster regions come from backend cluster output."
              icon={Network}
            >
              {hasVisualGraph ? (
                <>
                  <GraphCanvas
                    nodes={filteredNodes}
                    selectedId={selectedNode?.id}
                    hoveredId={hoveredId}
                    onHover={setHoveredId}
                    onLeave={() => setHoveredId(null)}
                    onSelect={setSelectedId}
                  />
                  <p className="mt-4 text-sm text-white/40">
                    The backend does not expose pairwise edges or edge weights, so this graph uses real node, cluster, centrality,
                    and tie-category data without inventing unsupported connection lines.
                  </p>
                </>
              ) : (
                <div className="space-y-5">
                  <EmptyState
                    icon={Network}
                    title={filteredNodes.length <= 1 ? "Graph structure is still sparse" : "Not enough graph structure yet"}
                    description={
                      filteredNodes.length <= 1
                        ? "You have real graph data, but not enough connected relationship structure yet to make a full graph canvas useful."
                        : "The backend has returned contacts, but not enough cluster or tie-strength structure to justify a large graph view yet."
                    }
                  />
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-wide text-white/35">How to unlock richer graph insights</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <button
                        onClick={() => navigate("/contacts")}
                        className="interactive-card rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-left"
                      >
                        <p className="text-sm font-medium text-white">Add more contacts</p>
                        <p className="mt-1 text-sm text-white/48">Broader contact coverage helps the backend build centrality and grouping signals.</p>
                      </button>
                      <button
                        onClick={() => navigate("/contacts")}
                        className="interactive-card rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-left"
                      >
                        <p className="text-sm font-medium text-white">Log interactions</p>
                        <p className="mt-1 text-sm text-white/48">Interaction history helps tie strength, weak-tie, and bridge detection emerge honestly.</p>
                      </button>
                      <button
                        onClick={() => navigate("/events")}
                        className="interactive-card rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-left"
                      >
                        <p className="text-sm font-medium text-white">Create events</p>
                        <p className="mt-1 text-sm text-white/48">Events can provide the backend with shared context that later supports clustering.</p>
                      </button>
                      <button
                        onClick={() => navigate("/recommendations")}
                        className="interactive-card rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-left"
                      >
                        <p className="text-sm font-medium text-white">Review recommendations</p>
                        <p className="mt-1 text-sm text-white/48">Relationship activity across the product helps stronger graph-level signals appear over time.</p>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </InsightCard>

            <InsightCard
              title="Selected contact"
              subtitle="Hover or click a node to inspect its graph summary."
              icon={Users2}
            >
              {selectedNode ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{selectedNode.name}</p>
                        <p className="mt-1 text-xs text-white/40">
                          {selectedNode.contact?.company || "No company"} • {selectedNode.contact?.role || "No role"}
                        </p>
                      </div>
                      <ScoreBadge score={selectedNode.score?.score ?? null} size="sm" />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-white/35">Centrality</p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {(selectedNode.centralityScore ?? 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-white/35">Interaction count</p>
                      <p className="mt-2 text-lg font-semibold text-white">{selectedNode.interactionCount}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-white/35">Graph reason</p>
                    <p className="mt-2 text-sm text-white/65">{selectedNode.reason}</p>
                  </div>

                  {selectedNode.clusterInfo ? (
                    <div className="rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-white/35">Cluster signals</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedNode.clusterInfo.sharedSignals.length ? (
                          selectedNode.clusterInfo.sharedSignals.map((signal) => (
                            <span
                              key={signal}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60"
                            >
                              {signal}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-white/40">No shared signals provided.</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3">
                      <p className="text-sm text-white/45">
                        This contact is not part of a returned cluster. The backend currently surfaces it as a standalone graph node.
                      </p>
                    </div>
                  )}

                  <div className="action-cluster">
                    <button
                      onClick={() => navigate(`/contacts/${selectedNode.id}`)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      Open contact profile
                    </button>
                    <button
                      onClick={() => setFollowUpTarget(selectedNode)}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Create follow-up
                    </button>
                    <button
                      onClick={() => handleGenerate(selectedNode)}
                      className="inline-flex items-center gap-2 rounded-xl border border-accent/25 bg-accent/12 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/20 transition-colors"
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate prep
                    </button>
                  </div>
                </div>
              ) : (
                <EmptyState title="No selected node" description="Choose a contact node to inspect graph context." />
              )}
            </InsightCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <InsightCard title="Strong relationships" subtitle="Backend-identified strong ties." icon={TrendingUp}>
              {graph?.strong_tie_contacts?.length ? (
                <div className="space-y-3">
                  {graph.strong_tie_contacts.map((item) => (
                      <button
                        key={`strong-${item.contact_id}`}
                        onClick={() => navigate(`/contacts/${item.contact_id}`)}
                        className="interactive-card w-full rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3 text-left hover:bg-white/[0.06] transition-colors"
                    >
                      <p className="text-sm font-medium text-white">{item.name}</p>
                      <p className="mt-1 text-sm text-white/50">{item.reason}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState title="No strong relationships" description="The backend did not return strong tie contacts yet." />
              )}
            </InsightCard>

            <InsightCard title="Weak relationships" subtitle="Weak-tie candidates surfaced by the backend." icon={TrendingDown}>
              {graph?.weak_tie_candidates?.length ? (
                <div className="space-y-3">
                  {graph.weak_tie_candidates.map((item) => (
                      <button
                        key={`weak-${item.contact_id}`}
                        onClick={() => navigate(`/contacts/${item.contact_id}`)}
                        className="interactive-card w-full rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3 text-left hover:bg-white/[0.06] transition-colors"
                    >
                      <p className="text-sm font-medium text-white">{item.name}</p>
                      <p className="mt-1 text-sm text-white/50">{item.reason}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState title="No weak tie candidates" description="No weak-tie insights are available for the current graph." />
              )}
            </InsightCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <InsightCard title="Bridge connections" subtitle="Contacts bridging clusters or communities." icon={Network}>
              {graph?.bridge_contacts?.length ? (
                <div className="space-y-3">
                  {graph.bridge_contacts.map((item) => (
                      <button
                        key={`bridge-${item.contact_id}`}
                        onClick={() => navigate(`/contacts/${item.contact_id}`)}
                        className="interactive-card w-full rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3 text-left hover:bg-white/[0.06] transition-colors"
                    >
                      <p className="text-sm font-medium text-white">{item.name}</p>
                      <p className="mt-1 text-sm text-white/50">{item.reason}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState title="No bridge contacts" description="The backend did not return any bridge connections for this network yet." />
              )}
            </InsightCard>

            <InsightCard title="Relationship clusters" subtitle="Cluster memberships surfaced by backend graph intelligence." icon={Users2}>
              {graph?.clusters?.length ? (
                <div className="space-y-3">
                  {graph.clusters.map((cluster) => (
                    <div key={cluster.cluster_id} className="rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3">
                      <p className="text-sm font-medium text-white">{cluster.shared_signals.join(", ") || cluster.cluster_id}</p>
                      <p className="mt-1 text-sm text-white/50">{cluster.contact_names.join(", ")}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No clusters available" description="Cluster visualization depends on backend cluster output, which is currently empty." />
              )}
            </InsightCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <InsightCard title="Isolated contacts" subtitle="Standalone contacts that may need reconnection." icon={Users2}>
              {graph?.isolated_contacts?.length ? (
                <div className="space-y-3">
                  {graph.isolated_contacts.map((item) => (
                    <button
                      key={`isolated-${item.contact_id}`}
                      onClick={() => navigate(`/contacts/${item.contact_id}`)}
                      className="interactive-card w-full rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3 text-left hover:bg-white/[0.06] transition-colors"
                    >
                      <p className="text-sm font-medium text-white">{item.name}</p>
                      <p className="mt-1 text-sm text-white/50">{item.reason}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState title="No isolated contacts" description="The backend is not flagging any isolated nodes right now." />
              )}
            </InsightCard>

            <InsightCard title="Growth opportunities" subtitle="Textual guidance from graph-derived relationship signals." icon={CalendarClock}>
              {(graph?.weak_tie_candidates?.length || 0) + (graph?.bridge_contacts?.length || 0) + (graph?.isolated_contacts?.length || 0) > 0 ? (
                <div className="space-y-3">
                  {graph?.bridge_contacts?.slice(0, 2).map((item) => (
                    <div key={`growth-bridge-${item.contact_id}`} className="rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3">
                      <p className="text-sm font-medium text-white">Activate bridge: {item.name}</p>
                      <p className="mt-1 text-sm text-white/50">{item.reason}</p>
                    </div>
                  ))}
                  {graph?.weak_tie_candidates?.slice(0, 2).map((item) => (
                    <div key={`growth-weak-${item.contact_id}`} className="rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3">
                      <p className="text-sm font-medium text-white">Reconnect weak tie: {item.name}</p>
                      <p className="mt-1 text-sm text-white/50">{item.reason}</p>
                    </div>
                  ))}
                  {graph?.isolated_contacts?.slice(0, 1).map((item) => (
                    <div key={`growth-isolated-${item.contact_id}`} className="rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3">
                      <p className="text-sm font-medium text-white">Re-engage isolated contact: {item.name}</p>
                      <p className="mt-1 text-sm text-white/50">{item.reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No graph growth opportunities" description="Add more contacts and interactions to unlock graph-based growth suggestions." />
              )}
            </InsightCard>
          </div>
        </>
      )}

      <Modal open={Boolean(followUpTarget)} onClose={() => setFollowUpTarget(null)} title="Create follow-up">
        {followUpTarget && (
          <FollowUpForm
            contactId={followUpTarget.id}
            initialValues={{
              title: `Follow up with ${followUpTarget.name}`,
              description: followUpTarget.reason,
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
