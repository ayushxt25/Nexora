import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isCompletedStatus(status) {
  const normalized = (status || "").toLowerCase();
  return ["completed", "complete", "done", "closed"].includes(normalized);
}

export function groupFollowUps(followUps) {
  const now = new Date();
  const groups = { overdue: [], today: [], upcoming: [], noDate: [], completed: [] };

  for (const followUp of followUps) {
    if (isCompletedStatus(followUp.status)) {
      groups.completed.push(followUp);
      continue;
    }

    if (!followUp.due_date) {
      groups.noDate.push(followUp);
      continue;
    }

    const due = new Date(followUp.due_date);
    if (isSameDay(due, now)) {
      groups.today.push(followUp);
    } else if (due < now) {
      groups.overdue.push(followUp);
    } else {
      groups.upcoming.push(followUp);
    }
  }

  return groups;
}

export function useFollowUps({ statusFilter, contactId, eventId, sortBy = "due_date", sortOrder = "asc" } = {}) {
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFollowUps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.followUps.list({
        status: statusFilter,
        contact_id: contactId,
        event_id: eventId,
        sort_by: sortBy,
        sort_order: sortOrder,
        limit: 100,
      });
      setFollowUps(data);
    } catch (err) {
      setError(err.message || "Failed to load follow-ups.");
    } finally {
      setLoading(false);
    }
  }, [contactId, eventId, sortBy, sortOrder, statusFilter]);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  return { followUps, loading, error, refetch: fetchFollowUps };
}
