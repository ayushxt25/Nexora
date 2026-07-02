import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";

export function useContactProfile(contactId) {
  const [contact, setContact] = useState(null);
  const [scoreEntry, setScoreEntry] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        contactData,
        scoreData,
        interactionsData,
        followUpsData,
        recommendationsData,
        opportunitiesData,
      ] = await Promise.all([
        api.contacts.get(contactId),
        api.relationshipScores.list(contactId).catch(() => null),
        api.interactions.list({
          contact_id: contactId,
          sort_order: "desc",
          limit: 100,
        }),
        api.followUps.list({
          contact_id: contactId,
          sort_by: "due_date",
          sort_order: "asc",
          limit: 100,
        }),
        api.recommendations.list({
          limit: 100,
          sort_by: "priority_score",
          sort_order: "desc",
        }).catch(() => []),
        api.opportunities.list().catch(() => []),
      ]);

      setContact(contactData);
      setScoreEntry(scoreData?.scores?.[0] ?? null);
      setInteractions(interactionsData || []);
      setFollowUps(followUpsData || []);
      setRecommendations(
        (recommendationsData || []).filter((item) => item.related_contact_id === Number(contactId))
      );
      setOpportunities(
        (opportunitiesData || []).filter((item) => item.related_contact_id === Number(contactId))
      );
    } catch (err) {
      setError(err.message || "Failed to load contact.");
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    contact,
    scoreEntry,
    interactions,
    followUps,
    recommendations,
    opportunities,
    loading,
    error,
    refetch: fetchAll,
  };
}
