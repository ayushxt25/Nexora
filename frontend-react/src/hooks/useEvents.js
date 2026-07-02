import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";

export function useEvents({
  q,
  location,
  sortBy = "event_date",
  sortOrder = "asc",
} = {}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.events.list({
        q,
        location,
        sort_by: sortBy,
        sort_order: sortOrder,
        limit: 100,
      });
      setEvents(data);
    } catch (err) {
      setError(err.message || "Failed to load events.");
    } finally {
      setLoading(false);
    }
  }, [location, q, sortBy, sortOrder]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}
