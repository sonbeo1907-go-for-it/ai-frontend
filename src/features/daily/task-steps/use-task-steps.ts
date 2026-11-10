"use client";

import { useCallback, useRef, useState } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { ApiClientError } from "@/lib/api-client";
import type { DailyPlanItem, DailyPlanTaskStep, DailyPlanTaskStepsResponse } from "@/types/api";
import {
  dailyPlanApi,
  type CreateTaskStepInput,
  type UpdateTaskStepInput,
} from "../daily-plan-api";
import { getTaskStepErrorMessage } from "./task-step-errors";

interface UseTaskStepsOptions {
  planId: string;
  versionId: string;
  item: DailyPlanItem;
  onChange: (response: DailyPlanTaskStepsResponse) => void;
  onUnavailable: () => void;
}

function responseFromItem(item: DailyPlanItem): DailyPlanTaskStepsResponse {
  return {
    dailyPlanItemId: item.id,
    steps: item.steps ?? [],
    progress: item.stepProgress ?? {
      requiredCount: 0,
      completedRequiredCount: 0,
      completionPercentage: 0,
      allRequiredStepsCompleted: false,
    },
  };
}

export function useTaskSteps({
  planId,
  versionId,
  item,
  onChange,
  onUnavailable,
}: UseTaskStepsOptions) {
  const { show } = useToast();
  const [data, setData] = useState(() => responseFromItem(item));
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const pendingRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);

  const accept = useCallback(
    (response: DailyPlanTaskStepsResponse) => {
      setData(response);
      onChange(response);
    },
    [onChange],
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await dailyPlanApi.getTaskSteps(planId, versionId, item.id);
      accept(response);
      return response;
    } catch (error) {
      show(getTaskStepErrorMessage(error), "error");
      if (error instanceof ApiClientError && error.details.code === "RESOURCE_NOT_FOUND") {
        onUnavailable();
      }
      return null;
    } finally {
      setRefreshing(false);
    }
  }, [accept, item.id, onUnavailable, planId, show, versionId]);

  const mutate = useCallback(
    async (
      key: string,
      request: () => Promise<DailyPlanTaskStepsResponse>,
      successMessage: string,
    ) => {
      if (pendingRef.current) return null;

      pendingRef.current = true;
      setPendingKey(key);
      try {
        const response = await request();
        accept(response);
        show(successMessage);
        return response;
      } catch (error) {
        const code = error instanceof ApiClientError ? error.details.code : null;
        show(getTaskStepErrorMessage(error), "error");

        if (code === "CONCURRENT_MODIFICATION") {
          await refresh();
        } else if (code === "RESOURCE_NOT_FOUND") {
          onUnavailable();
        } else if (
          code === "DAILY_PLAN_VERSION_NOT_EDITABLE" ||
          code === "DAILY_PLAN_VERSION_NOT_ACTIVE" ||
          code === "DAILY_PLAN_LOCKED"
        ) {
          await refresh();
        }

        return null;
      } finally {
        pendingRef.current = false;
        setPendingKey(null);
      }
    },
    [accept, onUnavailable, refresh, show],
  );

  const create = useCallback(
    (input: CreateTaskStepInput) =>
      mutate(
        "create",
        () => dailyPlanApi.createTaskStep(planId, versionId, item.id, input),
        "Đã thêm bước thực hiện.",
      ),
    [item.id, mutate, planId, versionId],
  );

  const update = useCallback(
    (step: DailyPlanTaskStep, input: Omit<UpdateTaskStepInput, "entityVersion">) =>
      mutate(
        `update:${step.id}`,
        () =>
          dailyPlanApi.updateTaskStep(planId, versionId, item.id, step.id, {
            ...input,
            entityVersion: step.entityVersion,
          }),
        "Đã cập nhật bước thực hiện.",
      ),
    [item.id, mutate, planId, versionId],
  );

  const remove = useCallback(
    (step: DailyPlanTaskStep) =>
      mutate(
        `delete:${step.id}`,
        () => dailyPlanApi.deleteTaskStep(planId, versionId, item.id, step.id, step.entityVersion),
        "Đã xóa bước thực hiện.",
      ),
    [item.id, mutate, planId, versionId],
  );

  const setCompletion = useCallback(
    (step: DailyPlanTaskStep, completed: boolean) =>
      mutate(
        `completion:${step.id}`,
        () =>
          dailyPlanApi.setTaskStepCompletion(
            planId,
            versionId,
            item.id,
            step.id,
            completed,
            step.stateVersion,
          ),
        completed ? "Đã hoàn thành bước." : "Đã bỏ đánh dấu bước.",
      ),
    [item.id, mutate, planId, versionId],
  );

  return {
    data,
    pendingKey,
    refreshing,
    create,
    update,
    remove,
    setCompletion,
    refresh,
  };
}
