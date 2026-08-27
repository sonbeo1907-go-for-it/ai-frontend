import { useState, useEffect, useCallback } from "react";
import { getErrorMessage } from "@/lib/api-client";
import type { WeakTopic } from "@/types/api";
import { getRoadmapWeakTopics } from "./weak-topics-api";

export function useWeakTopics(roadmapId: string) {
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeakTopics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRoadmapWeakTopics(roadmapId);
      setWeakTopics(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [roadmapId]);

  useEffect(() => {
    let mounted = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const data = await getRoadmapWeakTopics(roadmapId);
          if (mounted) {
            setWeakTopics(data || []);
            setLoading(false);
          }
        } catch (err) {
          if (mounted) {
            setError(getErrorMessage(err));
            setLoading(false);
          }
        }
      })();
    }, 0);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [roadmapId]);

  return { weakTopics, loading, error, fetchWeakTopics };
}
