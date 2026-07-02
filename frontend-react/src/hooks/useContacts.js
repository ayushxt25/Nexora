import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";

function getLatestInteractionMap(interactions) {
  const latestMap = new Map();

  for (const interaction of interactions) {
    if (!interaction.contact_id || !interaction.created_at) continue;
    const current = latestMap.get(interaction.contact_id);
    if (!current || new Date(interaction.created_at) > new Date(current)) {
      latestMap.set(interaction.contact_id, interaction.created_at);
    }
  }

  return latestMap;
}

export function useContacts({
  q,
  company,
  tag,
  sortBy = "updated_at",
  sortOrder = "desc",
} = {}) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [contactsData, scoresData, interactionsData] = await Promise.all([
        api.contacts.list({
          q,
          company,
          tag,
          sort_by: sortBy,
          sort_order: sortOrder,
          limit: 100,
        }),
        api.relationshipScores.list().catch(() => null),
        api.interactions.list({
          sort_order: "desc",
          limit: 100,
        }).catch(() => []),
      ]);

      const scoreMap = new Map();
      if (scoresData?.scores) {
        for (const score of scoresData.scores) {
          scoreMap.set(score.contact_id, score);
        }
      }

      const latestInteractionMap = getLatestInteractionMap(interactionsData || []);

      const mergedContacts = contactsData.map((contact) => {
        const scoreEntry = scoreMap.get(contact.id);
        return {
          ...contact,
          score: scoreEntry?.score ?? null,
          relationship_risk: scoreEntry?.relationship_risk ?? null,
          relationship_label: scoreEntry?.relationship_strength ?? null,
          last_interaction_at: latestInteractionMap.get(contact.id) ?? null,
        };
      });

      setContacts(mergedContacts);
    } catch (err) {
      setError(err.message || "Failed to load contacts.");
    } finally {
      setLoading(false);
    }
  }, [company, q, sortBy, sortOrder, tag]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return { contacts, loading, error, refetch: fetchContacts };
}
