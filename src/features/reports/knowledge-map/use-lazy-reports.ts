"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getErrorMessage } from "@/lib/api-client";
import type { KnowledgeMapResponse, WeakTopicTimelineItem } from "@/types/api";
import { fetchKnowledgeMap, fetchWeakTopicsTimeline } from "../report-api";

export type ReportTab = "KNOWLEDGE_MAP" | "WEAK_TOPICS";

interface ReportResource<T> {
  status: "idle" | "loading" | "success" | "error";
  data: T | null;
  error: string;
}

// Each page owns its caches. No report data survives a change of account or page unmount.
function createReportCache<T>() {
  const idle: ReportResource<T> = { status: "idle", data: null, error: "" };
  let snapshot: Record<string, ReportResource<T>> = {};
  const listeners = new Set<() => void>();
  const requests = new Map<string, AbortController>();
  let disposalTimer: ReturnType<typeof setTimeout> | undefined;

  function publish(key: string, resource: ReportResource<T>) {
    snapshot = { ...snapshot, [key]: resource };
    listeners.forEach((listener) => listener());
  }

  function cancel(key: string) {
    const controller = requests.get(key);
    if (!controller) return;
    requests.delete(key);
    controller.abort();
    const previous = snapshot[key];
    publish(
      key,
      previous?.data !== null && previous?.data !== undefined
        ? { ...previous, status: "success", error: "" }
        : idle,
    );
  }

  async function load(
    key: string,
    request: (signal: AbortSignal) => Promise<T>,
    force = false,
    aliases?: (data: T) => string[],
  ) {
    const previous = snapshot[key] ?? idle;
    if (requests.has(key) || (!force && previous.status !== "idle")) return;

    const controller = new AbortController();
    requests.set(key, controller);
    publish(key, { ...previous, status: "loading", error: "" });

    try {
      const data = await request(controller.signal);
      if (requests.get(key) !== controller) return;
      const resource: ReportResource<T> = { status: "success", data, error: "" };
      publish(key, resource);
      for (const alias of aliases?.(data) ?? []) {
        if (!requests.has(alias)) publish(alias, resource);
      }
    } catch (error) {
      if (requests.get(key) !== controller || controller.signal.aborted) return;
      publish(key, { ...previous, status: "error", error: getErrorMessage(error) });
    } finally {
      if (requests.get(key) === controller) requests.delete(key);
    }
  }

  return {
    idle,
    load,
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      clearTimeout(disposalTimer);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        // Strict Mode resubscribes immediately. Defer disposal to distinguish that from leaving.
        disposalTimer = setTimeout(() => {
          if (listeners.size === 0) [...requests.keys()].forEach(cancel);
        }, 0);
      };
    },
    cancelExcept(key: string | null) {
      for (const pendingKey of requests.keys()) {
        if (pendingKey !== key) cancel(pendingKey);
      }
    },
  };
}

const DEFAULT_SCOPE = "default";
const EMPTY_TIMELINE: ReportResource<WeakTopicTimelineItem[]> = {
  status: "success",
  data: [],
  error: "",
};

export function useLazyReports(tab: ReportTab, selectedRoadmapId: string) {
  const [maps] = useState(() => createReportCache<KnowledgeMapResponse>());
  const [timelines] = useState(() => createReportCache<WeakTopicTimelineItem[]>());
  const mapCache = useSyncExternalStore(maps.subscribe, maps.getSnapshot, maps.getSnapshot);
  const timelineCache = useSyncExternalStore(
    timelines.subscribe,
    timelines.getSnapshot,
    timelines.getSnapshot,
  );

  const mapScope = selectedRoadmapId || DEFAULT_SCOPE;
  const map = mapCache[mapScope] ?? maps.idle;
  const timelineScope = selectedRoadmapId || map.data?.roadmapId || null;
  const defaultResolved = Boolean(selectedRoadmapId) || map.data !== null;
  const timeline = timelineScope
    ? (timelineCache[timelineScope] ?? timelines.idle)
    : defaultResolved
      ? EMPTY_TIMELINE
      : timelines.idle;

  useEffect(() => {
    maps.cancelExcept(mapScope);
    timelines.cancelExcept(timelineScope);
  }, [mapScope, timelineScope, maps, timelines]);

  useEffect(() => {
    if (tab === "KNOWLEDGE_MAP" || !defaultResolved) {
      void maps.load(
        mapScope,
        (signal) => fetchKnowledgeMap(selectedRoadmapId || undefined, signal),
        false,
        (data) => (!selectedRoadmapId && data.roadmapId ? [data.roadmapId] : []),
      );
    }
    if (tab === "WEAK_TOPICS" && timelineScope) {
      void timelines.load(timelineScope, (signal) =>
        fetchWeakTopicsTimeline(timelineScope, signal),
      );
    }
  }, [tab, selectedRoadmapId, mapScope, timelineScope, defaultResolved, maps, timelines]);

  function refresh() {
    if (tab === "KNOWLEDGE_MAP" || !defaultResolved) {
      void maps.load(
        mapScope,
        (signal) => fetchKnowledgeMap(selectedRoadmapId || undefined, signal),
        true,
        (data) => (!selectedRoadmapId && data.roadmapId ? [data.roadmapId] : []),
      );
    } else if (timelineScope) {
      void timelines.load(
        timelineScope,
        (signal) => fetchWeakTopicsTimeline(timelineScope, signal),
        true,
      );
    }
  }

  // Resolving the default Roadmap is necessary before querying its Timeline.
  const resource = tab === "KNOWLEDGE_MAP" || !defaultResolved ? map : timeline;
  return {
    map,
    timeline,
    loading: resource.status === "idle" || resource.status === "loading",
    error: resource.error,
    refresh,
  };
}
