import { ApiClientError, AUTHENTICATION_EXPIRED_EVENT } from "@/lib/api-client";
import { getAiExecution, isActiveAiExecution, isTerminalAiExecution } from "@/lib/ai-execution-api";
import type { AiExecution } from "@/types/api";

export const POLLING_CONFIG = {
  INITIAL_POLL_INTERVAL: 1000,
  MAX_FOREGROUND_POLL_INTERVAL: 5000,
  JITTER_RATIO: 0.2, // +/- 20% jitter
  NETWORK_RETRY_BASE_DELAY: 2000,
  NETWORK_RETRY_MAX_DELAY: 15000,
} as const;

export interface PollerSnapshot {
  execution: AiExecution | null;
  error: Error | null;
  isPolling: boolean;
}

export const IDLE_POLLER_SNAPSHOT: Readonly<PollerSnapshot> = Object.freeze({
  execution: null,
  error: null,
  isPolling: false,
});

export function calculatePollDelay(pollCount: number, config = POLLING_CONFIG): number {
  const baseDelay = Math.min(
    config.INITIAL_POLL_INTERVAL * Math.pow(2, pollCount),
    config.MAX_FOREGROUND_POLL_INTERVAL,
  );
  const jitter = (Math.random() * 2 - 1) * config.JITTER_RATIO * baseDelay;
  return Math.max(0, Math.round(baseDelay + jitter));
}

export function calculateNetworkRetryDelay(failCount: number, config = POLLING_CONFIG): number {
  const exponent = Math.max(0, failCount - 1);
  const baseDelay = Math.min(
    config.NETWORK_RETRY_BASE_DELAY * Math.pow(2, exponent),
    config.NETWORK_RETRY_MAX_DELAY,
  );
  return baseDelay;
}

interface PollerContext {
  executionId: string;
  subscribers: Set<() => void>;
  execution: AiExecution | null;
  error: Error | null;
  isPolling: boolean;
  timerId: number | null;
  abortController: AbortController | null;
  requestSequence: number;
  latestAppliedRequestSequence: number;
  pollCount: number;
  failCount: number;
  snapshot: PollerSnapshot;
}

class AiExecutionPoller {
  private activePollers = new Map<string, PollerContext>();
  private visibilityListenerAttached = false;
  private authListenerAttached = false;

  constructor() {
    this.attachGlobalListeners();
  }

  private attachGlobalListeners() {
    if (typeof window === "undefined") return;

    if (!this.visibilityListenerAttached && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
      this.visibilityListenerAttached = true;
    }

    if (!this.authListenerAttached) {
      window.addEventListener(AUTHENTICATION_EXPIRED_EVENT, this.handleAuthExpired);
      this.authListenerAttached = true;
    }
  }

  private handleVisibilityChange = () => {
    if (typeof document === "undefined") return;

    if (document.visibilityState === "hidden") {
      // Pause all pending timers
      for (const context of this.activePollers.values()) {
        if (context.timerId !== null) {
          window.clearTimeout(context.timerId);
          context.timerId = null;
        }
      }
    } else if (document.visibilityState === "visible") {
      // Immediate refresh for all active non-terminal pollers, reset pollCount
      for (const context of this.activePollers.values()) {
        if (context.execution && isTerminalAiExecution(context.execution)) {
          continue;
        }
        context.pollCount = 0;
        if (context.timerId !== null) {
          window.clearTimeout(context.timerId);
          context.timerId = null;
        }
        void this.fetchExecution(context.executionId, false);
      }
    }
  };

  private handleAuthExpired = () => {
    this.clearAll();
  };

  private updateSnapshot(context: PollerContext, updates?: Partial<PollerSnapshot>) {
    const nextExecution =
      updates && "execution" in updates ? updates.execution! : context.execution;
    const nextError = updates && "error" in updates ? updates.error! : context.error;
    const nextIsPolling =
      updates && "isPolling" in updates ? Boolean(updates.isPolling) : context.isPolling;

    if (
      context.snapshot.execution === nextExecution &&
      context.snapshot.error === nextError &&
      context.snapshot.isPolling === nextIsPolling
    ) {
      return;
    }

    context.execution = nextExecution;
    context.error = nextError;
    context.isPolling = nextIsPolling;
    context.snapshot = {
      execution: nextExecution,
      error: nextError,
      isPolling: nextIsPolling,
    };

    for (const callback of context.subscribers) {
      try {
        callback();
      } catch (err) {
        console.error("Subscriber notification error:", err);
      }
    }
  }

  private getOrCreateContext(
    executionId: string,
    initialExecution?: AiExecution | null,
  ): PollerContext {
    let context = this.activePollers.get(executionId);
    if (!context) {
      context = {
        executionId,
        subscribers: new Set(),
        execution: initialExecution ?? null,
        error: null,
        isPolling: false,
        timerId: null,
        abortController: null,
        requestSequence: 0,
        latestAppliedRequestSequence: 0,
        pollCount: 0,
        failCount: 0,
        snapshot: {
          execution: initialExecution ?? null,
          error: null,
          isPolling: false,
        },
      };
      this.activePollers.set(executionId, context);
    } else if (initialExecution && !context.execution) {
      context.execution = initialExecution;
      context.snapshot = {
        ...context.snapshot,
        execution: initialExecution,
      };
    }
    return context;
  }

  public seedExecution(execution: AiExecution) {
    if (!execution || !execution.id) return;
    const context = this.getOrCreateContext(execution.id, execution);
    this.updateSnapshot(context, { execution, error: null });

    // If it's already active and no timer/poll is running, start polling
    if (
      isActiveAiExecution(execution) &&
      context.timerId === null &&
      context.abortController === null
    ) {
      this.schedulePoll(context, calculatePollDelay(context.pollCount));
    }
  }

  public subscribe(
    executionId: string | null | undefined,
    onStoreChange: () => void,
    initialExecution?: AiExecution | null,
  ): () => void {
    if (!executionId) {
      return () => {};
    }

    const context = this.getOrCreateContext(executionId, initialExecution);
    context.subscribers.add(onStoreChange);

    // Initial fetch/schedule logic
    if (context.execution) {
      if (
        isActiveAiExecution(context.execution) &&
        context.timerId === null &&
        context.abortController === null
      ) {
        // Active execution: schedule next poll
        this.schedulePoll(context, calculatePollDelay(context.pollCount));
      }
    } else {
      // No execution data yet: fetch immediately from backend (AC6 reload recovery)
      if (context.abortController === null && context.timerId === null) {
        void this.fetchExecution(executionId, false);
      }
    }

    return () => {
      context.subscribers.delete(onStoreChange);
      if (context.subscribers.size === 0) {
        // AC5: Cleanup on unmount / 0 subscribers
        if (context.timerId !== null) {
          window.clearTimeout(context.timerId);
          context.timerId = null;
        }
        if (context.abortController !== null) {
          context.abortController.abort();
          context.abortController = null;
        }
        this.activePollers.delete(executionId);
      }
    };
  }

  public getSnapshot(executionId: string | null | undefined): PollerSnapshot {
    if (!executionId) return IDLE_POLLER_SNAPSHOT;
    const context = this.activePollers.get(executionId);
    return context ? context.snapshot : IDLE_POLLER_SNAPSHOT;
  }

  public getServerSnapshot(): PollerSnapshot {
    return IDLE_POLLER_SNAPSHOT;
  }

  public refresh(executionId: string) {
    if (!executionId) return;
    const context = this.activePollers.get(executionId);
    if (!context) {
      // Create context and fetch
      void this.fetchExecution(executionId, true);
      return;
    }

    // AC7: Manual refresh lock - if in flight, do not send duplicate request
    if (context.abortController !== null) {
      return;
    }

    // Cancel pending timer
    if (context.timerId !== null) {
      window.clearTimeout(context.timerId);
      context.timerId = null;
    }

    context.pollCount = 0;
    void this.fetchExecution(executionId, true);
  }

  private schedulePoll(context: PollerContext, delayMs: number) {
    if (context.timerId !== null) {
      window.clearTimeout(context.timerId);
      context.timerId = null;
    }

    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      // AC4: Tab hidden -> pause polling completely
      return;
    }

    if (context.execution && isTerminalAiExecution(context.execution)) {
      // AC2: Stop at terminal state
      return;
    }

    context.timerId = window.setTimeout(() => {
      context.timerId = null;
      void this.fetchExecution(context.executionId, false);
    }, delayMs);
  }

  private async fetchExecution(executionId: string, isManualRefresh: boolean): Promise<void> {
    const context = this.activePollers.get(executionId);
    if (!context) return;

    if (
      !isManualRefresh &&
      typeof document !== "undefined" &&
      document.visibilityState === "hidden"
    ) {
      return;
    }

    if (!isManualRefresh && context.execution && isTerminalAiExecution(context.execution)) {
      return;
    }

    // Deduplication / in-flight check
    if (context.abortController !== null) {
      return;
    }

    const seq = ++context.requestSequence;
    const controller = new AbortController();
    context.abortController = controller;
    this.updateSnapshot(context, { isPolling: true });

    try {
      const execution = await getAiExecution(executionId, {
        signal: controller.signal,
      });

      // Ignore if aborted
      if (controller.signal.aborted) return;

      // Check request sequence to avoid out-of-order responses
      if (seq < context.latestAppliedRequestSequence) {
        return;
      }
      context.latestAppliedRequestSequence = seq;

      // Successful response: reset failCount!
      context.failCount = 0;

      if (isTerminalAiExecution(execution)) {
        // AC2: Stop immediately at terminal state
        if (context.timerId !== null) {
          window.clearTimeout(context.timerId);
          context.timerId = null;
        }
        this.updateSnapshot(context, {
          execution,
          error: null,
          isPolling: false,
        });
      } else {
        // Status is QUEUED or RUNNING (AC3)
        const delay = calculatePollDelay(context.pollCount);
        context.pollCount += 1;
        this.updateSnapshot(context, {
          execution,
          error: null,
          isPolling: false,
        });

        // Schedule next poll with backoff + jitter
        this.schedulePoll(context, delay);
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return;

      if (seq < context.latestAppliedRequestSequence) {
        return;
      }

      // Check 401 / session expiry
      if (err instanceof ApiClientError && err.details.status === 401) {
        // Stop polling, cancel timer, do not retry
        if (context.timerId !== null) {
          window.clearTimeout(context.timerId);
          context.timerId = null;
        }
        this.updateSnapshot(context, {
          error: err,
          isPolling: false,
        });
        return;
      }

      // Check 404 execution not found
      if (err instanceof ApiClientError && err.details.status === 404) {
        if (context.timerId !== null) {
          window.clearTimeout(context.timerId);
          context.timerId = null;
        }
        this.updateSnapshot(context, {
          error: err,
          isPolling: false,
        });
        return;
      }

      // Network / 5xx temporary failure
      // Do NOT set execution to FAILED. Backend is authoritative.
      context.failCount += 1;
      const errorObj = err instanceof Error ? err : new Error(String(err));
      this.updateSnapshot(context, {
        error: errorObj,
        isPolling: false,
      });

      // Schedule network retry
      const retryDelay = calculateNetworkRetryDelay(context.failCount);
      this.schedulePoll(context, retryDelay);
    } finally {
      if (context.abortController === controller) {
        context.abortController = null;
      }
      this.updateSnapshot(context, { isPolling: false });
    }
  }

  public clearAll() {
    for (const context of this.activePollers.values()) {
      if (context.timerId !== null) {
        window.clearTimeout(context.timerId);
        context.timerId = null;
      }
      if (context.abortController !== null) {
        context.abortController.abort();
        context.abortController = null;
      }
      this.updateSnapshot(context, { isPolling: false });
      context.subscribers.clear();
    }
    this.activePollers.clear();
  }

  public getActivePollerCount(): number {
    return this.activePollers.size;
  }
}

export const aiExecutionPoller = new AiExecutionPoller();
