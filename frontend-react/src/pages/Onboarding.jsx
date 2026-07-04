import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ListChecks,
  Sparkles,
  UserCircle2,
  Users2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import Button from "../components/Button";
import ContactForm from "../components/domain/ContactForm";
import EventForm from "../components/domain/EventForm";
import FollowUpForm from "../components/domain/FollowUpForm";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import { SkeletonCard } from "../components/ui/SkeletonLoader";
import { useOnboardingStatus } from "../hooks/useOnboardingStatus";

function toCsv(value) {
  return Array.isArray(value) ? value.join(", ") : "";
}

function fromCsv(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildProfileForm(profile) {
  return {
    full_name: profile?.full_name || "",
    headline: profile?.headline || "",
    goals: toCsv(profile?.goals),
    interests: toCsv(profile?.interests),
    preferred_tone: profile?.preferred_tone || "",
  };
}

function StepPill({ active, complete, index, label }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
        active
          ? "border-accent/40 bg-accent/10"
          : complete
            ? "border-emerald-500/20 bg-emerald-500/10"
            : "border-white/8 bg-white/[0.03]"
      }`}
    >
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-sm font-semibold ${
          complete
            ? "bg-emerald-500/20 text-emerald-200"
            : active
              ? "bg-accent/20 text-accent"
              : "bg-white/5 text-white/45"
        }`}
      >
        {complete ? <CheckCircle2 className="h-4 w-4" /> : index}
      </span>
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
      </div>
    </div>
  );
}

function WelcomeChecklist({ summary }) {
  const items = [
    {
      label: "Profile",
      description: summary.profileComplete ? "Your profile is already in place." : "Add your name, goals, interests, or tone.",
      complete: summary.profileComplete,
      icon: UserCircle2,
    },
    {
      label: "First contact",
      description: summary.hasContacts
        ? "You already have at least one contact."
        : "Create your first relationship record.",
      complete: summary.hasContacts,
      icon: Users2,
    },
    {
      label: "First action",
      description: summary.hasActivity
        ? "You already have an event or follow-up."
        : "Add an event or a follow-up to activate the workflow.",
      complete: summary.hasActivity,
      icon: summary.hasEvents ? CalendarDays : ListChecks,
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map(({ label, description, complete, icon: Icon }) => (
        <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04]">
              <Icon className="h-4 w-4 text-accent" />
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                complete ? "bg-emerald-500/15 text-emerald-200" : "bg-white/5 text-white/55"
              }`}
            >
              {complete ? "Complete" : "Pending"}
            </span>
          </div>
          <p className="mt-4 text-sm font-medium text-white">{label}</p>
          <p className="mt-1 text-sm text-white/50">{description}</p>
        </div>
      ))}
    </div>
  );
}

function ProfileStep({ form, setForm, saving, error, saveMessage, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/70">Full name</label>
          <input
            type="text"
            value={form.full_name}
            onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-accent/50"
            placeholder="Your full name"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/70">Headline</label>
          <input
            type="text"
            value={form.headline}
            onChange={(event) => setForm((prev) => ({ ...prev, headline: event.target.value }))}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-accent/50"
            placeholder="What you want to be known for"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/70">Goals</label>
          <textarea
            rows={4}
            value={form.goals}
            onChange={(event) => setForm((prev) => ({ ...prev, goals: event.target.value }))}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-accent/50 resize-none"
            placeholder="Comma-separated goals"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/70">Interests</label>
          <textarea
            rows={4}
            value={form.interests}
            onChange={(event) => setForm((prev) => ({ ...prev, interests: event.target.value }))}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-accent/50 resize-none"
            placeholder="Comma-separated interests"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-white/70">Preferred tone</label>
        <input
          type="text"
          value={form.preferred_tone}
          onChange={(event) => setForm((prev) => ({ ...prev, preferred_tone: event.target.value }))}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-accent/50"
          placeholder="Warm, concise, confident"
        />
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {saveMessage ? <p className="text-sm text-emerald-300">{saveMessage}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={saving} icon={Sparkles}>
          Save profile
        </Button>
      </div>
    </form>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const { username } = useAuth();
  const {
    profile,
    contacts,
    events,
    followUps,
    loading,
    error,
    refresh,
    preference,
    setPreferenceStatus,
    profileComplete,
    hasContacts,
    hasEvents,
    hasFollowUps,
    hasActivity,
    needsOnboarding,
  } = useOnboardingStatus(username);

  const [step, setStep] = useState(0);
  const [profileForm, setProfileForm] = useState(buildProfileForm(null));
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSaveMessage, setProfileSaveMessage] = useState("");
  const [contactSaving, setContactSaving] = useState(false);
  const [activitySaving, setActivitySaving] = useState(false);
  const [activityMode, setActivityMode] = useState("event");

  const fromAuth = location.state?.fromAuth;

  useEffect(() => {
    setProfileForm(buildProfileForm(profile));
  }, [profile]);

  useEffect(() => {
    if (!loading && fromAuth && preference.status === "skipped" && needsOnboarding) {
      navigate("/dashboard", { replace: true });
    }
  }, [fromAuth, loading, navigate, needsOnboarding, preference.status]);

  useEffect(() => {
    if (!loading && fromAuth && !needsOnboarding) {
      navigate("/dashboard", { replace: true });
    }
  }, [fromAuth, loading, navigate, needsOnboarding]);

  useEffect(() => {
    if (profileComplete && step === 1) setStep(2);
    if (hasContacts && step === 2) setStep(3);
    if (hasActivity && step === 3) setStep(4);
  }, [hasActivity, hasContacts, profileComplete, step]);

  const summary = useMemo(
    () => ({
      profileComplete,
      hasContacts,
      hasEvents,
      hasFollowUps,
      hasActivity,
    }),
    [profileComplete, hasContacts, hasEvents, hasFollowUps, hasActivity]
  );

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setProfileSaving(true);
    setProfileError("");
    setProfileSaveMessage("");

    try {
      await api.profile.update({
        full_name: profileForm.full_name || null,
        headline: profileForm.headline || null,
        goals: fromCsv(profileForm.goals),
        interests: fromCsv(profileForm.interests),
        preferred_tone: profileForm.preferred_tone || null,
      });
      setPreferenceStatus(null);
      setProfileSaveMessage("Profile saved. You can move to the next step.");
      refresh();
      setStep(2);
    } catch (err) {
      setProfileError(err.message || "Failed to save profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleContactSubmit(payload) {
    setContactSaving(true);
    try {
      await api.contacts.create(payload);
      setPreferenceStatus(null);
      refresh();
      setStep(3);
    } finally {
      setContactSaving(false);
    }
  }

  async function handleEventSubmit(payload) {
    setActivitySaving(true);
    try {
      await api.events.create(payload);
      setPreferenceStatus(null);
      setPreferenceStatus("completed");
      refresh();
      setStep(4);
    } finally {
      setActivitySaving(false);
    }
  }

  async function handleFollowUpSubmit(payload) {
    setActivitySaving(true);
    try {
      await api.followUps.create(payload);
      setPreferenceStatus(null);
      setPreferenceStatus("completed");
      refresh();
      setStep(4);
    } finally {
      setActivitySaving(false);
    }
  }

  function handleSkip() {
    setPreferenceStatus("skipped");
    navigate("/dashboard", { replace: true });
  }

  function handleFinish() {
    setPreferenceStatus("completed");
    navigate("/dashboard", { replace: true });
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorState message={error} onRetry={refresh} />
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
      <section className="glass rounded-[28px] p-6 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.2em] text-white/30">First-Time Setup</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Set up your relationship workspace</h1>
            <p className="mt-3 text-sm sm:text-base text-white/55">
              Add the details Nexora needs to personalize your experience and make your workspace feel useful from the
              start.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => navigate("/dashboard")}>
              Back to dashboard
            </Button>
            {needsOnboarding ? (
              <Button variant="ghost" onClick={handleSkip}>
                Skip for now
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-6">
          <WelcomeChecklist summary={summary} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <section className="space-y-3">
          <StepPill index={1} label="Welcome" active={step === 0} complete={step > 0} />
          <StepPill index={2} label="Profile setup" active={step === 1} complete={profileComplete} />
          <StepPill index={3} label="First contact" active={step === 2} complete={hasContacts} />
          <StepPill index={4} label="First event or follow-up" active={step === 3} complete={hasActivity} />
          <StepPill index={5} label="Finish" active={step === 4} complete={!needsOnboarding} />
        </section>

        <section className="glass rounded-[28px] p-5 lg:p-8 min-h-[480px]">
          <AnimatePresence mode="wait">
            {step === 0 ? (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-semibold text-white">Welcome to your relationship workspace</h2>
                  <p className="mt-2 text-white/55">
                    We'll help you add just enough detail to unlock recommendations, opportunities, analytics, and
                    a more useful command center.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <Users2 className="h-5 w-5 text-accent" />
                    <p className="mt-3 text-sm font-medium text-white">Start with identity</p>
                    <p className="mt-1 text-sm text-white/50">Profile data tunes recommendations and generation.</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <Sparkles className="h-5 w-5 text-accent" />
                    <p className="mt-3 text-sm font-medium text-white">Add one relationship</p>
                    <p className="mt-1 text-sm text-white/50">A first contact gives the app something concrete to score.</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <ChevronRight className="h-5 w-5 text-accent" />
                    <p className="mt-3 text-sm font-medium text-white">Create one next step</p>
                    <p className="mt-1 text-sm text-white/50">An event or follow-up makes the workflow feel alive.</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => setStep(profileComplete ? (hasContacts ? (hasActivity ? 4 : 3) : 2) : 1)} icon={ArrowRight}>
                    {profileComplete || hasContacts || hasActivity ? "Resume setup" : "Start onboarding"}
                  </Button>
                  {needsOnboarding ? (
                    <Button variant="ghost" onClick={handleSkip}>
                      Skip for now
                    </Button>
                  ) : (
                    <Button variant="secondary" onClick={handleFinish}>
                      Go to dashboard
                    </Button>
                  )}
                </div>
              </motion.div>
            ) : null}

            {step === 1 ? (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-2xl font-semibold text-white">Profile setup</h2>
                  <p className="mt-2 text-white/55">
                    Add the profile details Nexora can use to personalize recommendations and preparation.
                  </p>
                </div>
                <ProfileStep
                  form={profileForm}
                  setForm={setProfileForm}
                  saving={profileSaving}
                  error={profileError}
                  saveMessage={profileSaveMessage}
                  onSubmit={handleProfileSubmit}
                />
              </motion.div>
            ) : null}

            {step === 2 ? (
              <motion.div
                key="contact"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-2xl font-semibold text-white">Add your first contact</h2>
                  <p className="mt-2 text-white/55">
                    One contact is enough to start unlocking relationship scoring and future recommendations.
                  </p>
                </div>
                <ContactForm
                  onSubmit={handleContactSubmit}
                  onCancel={() => navigate("/dashboard")}
                  submitting={contactSaving}
                />
              </motion.div>
            ) : null}

            {step === 3 ? (
              <motion.div
                key="activity"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-2xl font-semibold text-white">Create your first next step</h2>
                  <p className="mt-2 text-white/55">
                    Choose either an event or a follow-up to activate your workspace and start organizing next actions.
                  </p>
                </div>

                <div className="inline-flex gap-2 rounded-2xl border border-white/8 bg-white/[0.03] p-1">
                  <button
                    type="button"
                    onClick={() => setActivityMode("event")}
                    className={`rounded-xl px-4 py-2 text-sm transition-colors ${
                      activityMode === "event" ? "bg-accent text-white" : "text-white/55 hover:text-white"
                    }`}
                  >
                    First event
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityMode("follow-up")}
                    className={`rounded-xl px-4 py-2 text-sm transition-colors ${
                      activityMode === "follow-up" ? "bg-accent text-white" : "text-white/55 hover:text-white"
                    }`}
                  >
                    First follow-up
                  </button>
                </div>

                {activityMode === "event" ? (
                  <EventForm onSubmit={handleEventSubmit} onCancel={() => navigate("/dashboard")} submitting={activitySaving} />
                ) : (
                  <FollowUpForm onSubmit={handleFollowUpSubmit} onCancel={() => navigate("/dashboard")} submitting={activitySaving} />
                )}
              </motion.div>
            ) : null}

            {step === 4 ? (
              <motion.div
                key="finish"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {!needsOnboarding ? (
                  <>
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-500/15 text-emerald-200">
                      <CheckCircle2 className="h-7 w-7" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-white">You’re set up</h2>
                      <p className="mt-2 text-white/55">
                        Your workspace is ready to start tracking contacts, follow-ups, recommendations, and prep.
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                        <p className="text-xs uppercase tracking-wide text-white/35">Profile</p>
                        <p className="mt-2 text-base font-semibold text-white">Configured</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                        <p className="text-xs uppercase tracking-wide text-white/35">Contacts</p>
                        <p className="mt-2 text-base font-semibold text-white">At least one added</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                        <p className="text-xs uppercase tracking-wide text-white/35">Activity</p>
                        <p className="mt-2 text-base font-semibold text-white">
                          {hasEvents ? "Event added" : "Follow-up added"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button onClick={handleFinish}>Open dashboard</Button>
                      <Button variant="secondary" onClick={() => navigate("/contacts")}>
                        Open contacts
                      </Button>
                    </div>
                  </>
                ) : (
                  <EmptyState
                    icon={Sparkles}
                    title="You still have a few setup items left"
                    description="Add a little more profile or activity detail to finish setting up your workspace."
                    actionLabel="Resume onboarding"
                    onAction={() => setStep(profileComplete ? (hasContacts ? 3 : 2) : 1)}
                  />
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </section>
      </div>
    </motion.div>
  );
}

