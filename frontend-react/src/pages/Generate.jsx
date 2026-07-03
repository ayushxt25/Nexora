import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CalendarClock,
  Check,
  Copy,
  History,
  RefreshCw,
  Sparkles,
  Tag,
  Users2,
} from "lucide-react";
import { api } from "../api/client";
import Button from "../components/Button";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import { SkeletonCard, SkeletonLine } from "../components/ui/SkeletonLoader";

const examplePrompts = [
  {
    label: "Climate event",
    description: "AI for Sustainable Cities conference with climate tech founders and urban policy leaders",
    interests: "climate change, urban planning, public-private partnerships",
  },
  {
    label: "Recruiter outreach",
    description: "Small recruiting meetup for engineering leaders and platform teams",
    interests: "hiring, developer experience, technical leadership",
  },
  {
    label: "Investor dinner",
    description: "Private dinner with fintech operators, angel investors, and payments founders",
    interests: "payments, product strategy, venture building",
  },
];

const feedbackActions = [
  { key: "helpful", label: "Helpful", action: "like" },
  { key: "too_generic", label: "Too generic", action: "dislike" },
  { key: "wrong_tone", label: "Wrong tone", action: "dislike" },
];

function parseInterests(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildContextCards(prefill, parsedInterests) {
  const cards = [];

  if (prefill?.contact) {
    cards.push({
      key: "contact",
      title: "Contact context",
      lines: [
        prefill.contact.name,
        [prefill.contact.company, prefill.contact.role].filter(Boolean).join(" - "),
        prefill.contact.notes || "",
      ].filter(Boolean),
      chips: Array.isArray(prefill.contact.tags) ? prefill.contact.tags : [],
    });
  }

  if (prefill?.event) {
    cards.push({
      key: "event",
      title: "Event context",
      lines: [
        prefill.event.title,
        prefill.event.location || "",
        prefill.event.date ? new Date(prefill.event.date).toLocaleString() : "",
      ].filter(Boolean),
      chips: Array.isArray(prefill.event.goals) ? prefill.event.goals : [],
    });
  }

  if (prefill?.recommendation) {
    cards.push({
      key: "recommendation",
      title: "Recommendation context",
      lines: [
        prefill.recommendation.title,
        prefill.recommendation.type ? prefill.recommendation.type.replaceAll("_", " ") : "",
        prefill.recommendation.reason || "",
      ].filter(Boolean),
      chips: prefill.contactName ? [prefill.contactName] : [],
    });
  }

  if (prefill?.opportunity) {
    cards.push({
      key: "opportunity",
      title: "Opportunity context",
      lines: [
        prefill.opportunity.title,
        prefill.opportunity.type ? prefill.opportunity.type.replaceAll("_", " ") : "",
        prefill.opportunity.recommendedAction || "",
      ].filter(Boolean),
      chips: prefill.contactName ? [prefill.contactName] : [],
    });
  }

  if (!cards.length && parsedInterests.length) {
    cards.push({
      key: "interests",
      title: "Interest context",
      lines: ["The generator will use these interests as direct prompt context."],
      chips: parsedInterests,
    });
  }

  return cards;
}

export default function Generate() {
  const location = useLocation();
  const navigate = useNavigate();
  const prefill = location.state?.prefill || null;

  const [description, setDescription] = useState("");
  const [interests, setInterests] = useState("");
  const [themes, setThemes] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [feedbackGiven, setFeedbackGiven] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState("");
  const [submittedOnce, setSubmittedOnce] = useState(false);

  useEffect(() => {
    if (!prefill) return;
    if (prefill.description) setDescription(prefill.description);
    if (prefill.interests) setInterests(prefill.interests);
  }, [prefill]);

  const parsedInterests = useMemo(() => parseInterests(interests), [interests]);
  const contextCards = useMemo(() => buildContextCards(prefill, parsedInterests), [prefill, parsedInterests]);
  const sourceLabel = prefill?.sourceTitle || prefill?.contact?.name || prefill?.event?.title || "";

  async function runGeneration() {
    setError("");
    if (!description.trim() || parsedInterests.length === 0) {
      setError("Please add an event or relationship scenario and at least one interest.");
      return;
    }

    setLoading(true);
    setSuggestions([]);
    setThemes([]);
    setFeedbackGiven({});
    try {
      const data = await api.generateConversation(description, parsedInterests);
      setThemes(data.themes || []);
      setSuggestions(data.suggestions || []);
      setSubmittedOnce(true);
    } catch (err) {
      if (err.status === 429) {
        setError("You're generating too quickly. Please wait a moment and try again.");
      } else if (err.status === 401) {
        setError("Your session has expired. Please log in again.");
      } else {
        setError(err.message || "Something went wrong while generating.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate(event) {
    event?.preventDefault();
    await runGeneration();
  }

  async function handleFeedback(suggestion, category, action) {
    try {
      await api.submitFeedback({
        suggestion,
        action,
        category,
        target_type: "generation_suggestion",
        notes: sourceLabel ? `Source context: ${sourceLabel}` : undefined,
      });
      setFeedbackGiven((prev) => ({ ...prev, [suggestion]: category }));
    } catch {
      // Keep generation flow fail-open if feedback logging is unavailable.
    }
  }

  async function handleCopy(value, key) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(""), 1200);
    } catch {
      setCopiedKey("");
    }
  }

  function useExample(example) {
    setDescription(example.description);
    setInterests(example.interests);
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
          <p className="page-kicker">AI Preparation Workspace</p>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Relationship Prep Workspace</h1>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/54">
            Build conversation starters from real event, contact, recommendation, and opportunity context. Successful
            generations are saved automatically to your history.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white/60">
              Real generated output
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white/60">
              History saved automatically
            </span>
          </div>
        </div>

        <div className="action-cluster">
          <Button variant="secondary" icon={History} onClick={() => navigate("/history")}>
            Open history
          </Button>
          <Button icon={Sparkles} onClick={runGeneration} loading={loading}>
            {suggestions.length ? "Regenerate" : "Generate starters"}
          </Button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="glass min-w-0 overflow-hidden rounded-2xl p-5 lg:p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-white">Preparation input</h2>
            <p className="mt-1 text-sm text-white/45">
              Describe the relationship moment you are preparing for and the interests you want the generator to
              emphasize.
            </p>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Scenario or event description</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
                placeholder="Example: Coffee chat with a recruiter before an AI infrastructure meetup"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-accent/50 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Interests and angles</label>
              <input
                type="text"
                value={interests}
                onChange={(event) => setInterests(event.target.value)}
                placeholder="Example: hiring, platform engineering, developer productivity"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-accent/50"
              />
            </div>

            <div className="action-cluster">
              {examplePrompts.map((example) => (
                <button
                  type="button"
                  key={example.label}
                  onClick={() => useExample(example)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {example.label}
                </button>
              ))}
            </div>

            {error ? <ErrorState message={error} /> : null}

            <div className="action-cluster">
              <Button type="submit" icon={Sparkles} loading={loading}>
                Generate conversation starters
              </Button>
              {submittedOnce ? (
                <Button type="button" variant="secondary" icon={RefreshCw} onClick={runGeneration} loading={loading}>
                  Regenerate
                </Button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="glass rounded-2xl p-5 lg:p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-white">Context preview</h2>
            <p className="mt-1 text-sm text-white/45">
              This is the real context visible to the frontend before the backend adds stored relationship data and
              semantic memory.
            </p>
          </div>

          {sourceLabel ? (
            <div className="rounded-xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-accent">
              Loaded from {sourceLabel}
            </div>
          ) : null}

          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-wide text-white/35">Interest tags</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {parsedInterests.length ? (
                parsedInterests.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/65"
                  >
                    <Tag className="h-3 w-3 text-accent" />
                    {item}
                  </span>
                ))
              ) : (
                <span className="text-sm text-white/40">Add interests to preview the prompt inputs.</span>
              )}
            </div>
          </div>

          {contextCards.length ? (
            <div className="space-y-3">
              {contextCards.map((card) => (
                <div key={card.key} className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-wide text-white/35">{card.title}</p>
                  <div className="mt-2 space-y-1">
                    {card.lines.map((line) => (
                      <p key={line} className="text-sm text-white/70">
                        {line}
                      </p>
                    ))}
                  </div>
                  {card.chips.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {card.chips.map((chip) => (
                        <span
                          key={chip}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/55"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users2}
              title="No linked prep context yet"
              description="Open this page from a contact, event, recommendation, or opportunity to carry richer relationship context into generation."
            />
          )}
        </section>
      </div>

      {loading ? (
        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="glass rounded-2xl p-5 lg:p-6 space-y-4">
            <SkeletonLine width="35%" />
            <SkeletonLine width="80%" />
            <SkeletonLine width="65%" />
            <SkeletonLine width="50%" />
          </div>
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </section>
      ) : null}

      {!loading && !suggestions.length && !themes.length && !error ? (
        <EmptyState
          icon={Sparkles}
          title="No prep output yet"
          description="Generate conversation starters to see detected themes, reusable openers, and feedback actions."
        />
      ) : null}

      {!loading && (themes.length > 0 || suggestions.length > 0) ? (
        <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
          <section className="glass rounded-2xl p-5 lg:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-accent" />
              <h2 className="text-base font-semibold text-white">Generation summary</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-wide text-white/35">Themes</p>
                <p className="mt-2 text-xl font-semibold text-white">{themes.length}</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-wide text-white/35">Starters</p>
                <p className="mt-2 text-xl font-semibold text-white">{suggestions.length}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-xs uppercase tracking-wide text-emerald-200/70">History</p>
                <p className="mt-2 text-sm font-medium text-emerald-200">Saved automatically</p>
              </div>
            </div>

            {themes.length ? (
              <div>
                <p className="text-sm font-medium text-white/70">Detected themes</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {themes.map((theme) => (
                    <span
                      key={theme}
                      className="rounded-full border border-accent/20 bg-accent/12 px-3 py-1 text-xs font-medium text-accent"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-sm text-white/60">
                Use feedback actions below to improve future recommendation and preparation ranking. The backend does
                not currently expose a separate "save draft" endpoint because successful generations already persist to
                history.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" icon={History} onClick={() => navigate("/history")}>
                  View history
                </Button>
                <Button
                  variant="secondary"
                  icon={Copy}
                  onClick={() => handleCopy(suggestions.join("\n"), "all")}
                  disabled={!suggestions.length}
                >
                  {copiedKey === "all" ? "Copied all" : "Copy all"}
                </Button>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Generated conversation sections</h2>
              <button
                onClick={runGeneration}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/65 transition-colors hover:bg-white/10 hover:text-white"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </button>
            </div>

            {suggestions.map((suggestion, index) => (
              <motion.div
                key={`${suggestion}-${index}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: index * 0.04 }}
                className="glass rounded-2xl p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/35">Starter {index + 1}</p>
                    <p className="mt-2 text-sm leading-7 text-white/80">{suggestion}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(suggestion, `suggestion-${index}`)}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/65 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {copiedKey === `suggestion-${index}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedKey === `suggestion-${index}` ? "Copied" : "Copy"}
                  </button>
                </div>

                <div className="action-cluster">
                  {feedbackActions.map((item) => {
                    const active = feedbackGiven[suggestion] === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => handleFeedback(suggestion, item.key, item.action)}
                        className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                          active
                            ? "border-accent/30 bg-accent/15 text-accent"
                            : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </section>
        </div>
      ) : null}
    </motion.div>
  );
}
