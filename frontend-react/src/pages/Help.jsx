import { motion } from "framer-motion";
import { CircleHelp, Compass, Lightbulb, Sparkles, Users2 } from "lucide-react";

function HelpCard({ icon: Icon, title, description, bullets }) {
  return (
    <section className="glass rounded-2xl p-5 lg:p-6">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/5">
          <Icon className="h-4 w-4 text-accent" />
        </span>
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      <p className="mt-3 text-sm text-white/55">{description}</p>
      <div className="mt-4 space-y-2">
        {bullets.map((item) => (
          <p key={item} className="text-sm text-white/70">
            {item}
          </p>
        ))}
      </div>
    </section>
  );
}

export default function Help() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6"
    >
      <section>
        <div className="flex items-center gap-2">
          <CircleHelp className="h-5 w-5 text-accent" />
          <h1 className="text-2xl font-semibold text-white">Help</h1>
        </div>
        <p className="mt-2 text-sm text-white/50">
          A quick guide to the major sections of the app and how to use the product effectively.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <HelpCard
          icon={Compass}
          title="Command Center"
          description="Use the Dashboard, Follow-ups, Recommendations, and Opportunities pages to understand what needs your attention next."
          bullets={[
            "Dashboard summarizes your current state across analytics, next-best actions, and network snapshots.",
            "Follow-ups help you execute on overdue, current, and upcoming relationship tasks.",
            "Recommendations and Opportunities surface real backend-generated actions and strategic openings.",
          ]}
        />

        <HelpCard
          icon={Users2}
          title="Relationships"
          description="Use Contacts, Contact Profiles, Events, and the Network Graph to understand people, context, and relationship structure."
          bullets={[
            "Contacts act as the CRM backbone for your network data.",
            "Contact Profile pages combine score, interactions, follow-ups, and related actions.",
            "Events and Network Graph add context around timing, clusters, and bridge connections.",
          ]}
        />

        <HelpCard
          icon={Sparkles}
          title="Prep Workspace"
          description="Use Generate, Fact Check, History, and Feedback History to prepare for conversations and refine output quality over time."
          bullets={[
            "Generate creates relationship preparation starters using your existing backend context.",
            "Fact Check verifies a topic before you bring it into a conversation.",
            "History and Feedback History help you reuse and improve what worked.",
          ]}
        />

        <HelpCard
          icon={Lightbulb}
          title="Insights"
          description="Use Relationship Scores, Analytics, and graph intelligence to prioritize your networking effort."
          bullets={[
            "Relationship Scores help you see who is strong, weak, risky, or strategic.",
            "Analytics summarizes contact, interaction, and follow-up health.",
            "Developer Console remains separate in the profile menu for internal debugging and observability.",
          ]}
        />
      </div>
    </motion.div>
  );
}
