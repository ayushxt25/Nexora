import { useState } from "react";
import CustomSelect from "../ui/CustomSelect";

const interactionTypeOptions = [
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "message", label: "Message" },
  { value: "event", label: "Event" },
];

const sentimentOptions = [
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" },
];

export default function InteractionForm({ contactId, onSubmit, onCancel, submitting }) {
  const [interactionType, setInteractionType] = useState("call");
  const [notes, setNotes] = useState("");
  const [sentiment, setSentiment] = useState("neutral");
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!notes.trim()) {
      setError("Notes are required.");
      return;
    }
    try {
      await onSubmit({
        contact_id: contactId,
        interaction_type: interactionType,
        notes: notes.trim(),
        sentiment,
      });
    } catch (err) {
      setError(err.message || "Couldn't log this interaction.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <p className="text-sm text-red-400">{error}</p>}

      <CustomSelect
        value={interactionType}
        onChange={setInteractionType}
        options={interactionTypeOptions}
        placeholder="Call"
      />

      <CustomSelect
        value={sentiment}
        onChange={setSentiment}
        options={sentimentOptions}
        placeholder="Neutral"
      />

      <textarea
        placeholder="What happened?"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-accent/50 resize-none"
      />

      <div className="flex justify-end gap-2 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {submitting ? "Logging..." : "Log interaction"}
        </button>
      </div>
    </form>
  );
}
