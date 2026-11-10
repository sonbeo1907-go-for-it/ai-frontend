"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/field";
import type { DailyPlanItem } from "@/types/api";

type PomodoroModalProps = {
  open: boolean;
  onClose: () => void;
  items: DailyPlanItem[];
  initialTaskId?: string;
  onComplete: (taskId: string, minutes: number) => Promise<void>;
};

export function PomodoroModal({
  open,
  onClose,
  items,
  initialTaskId,
  onComplete,
}: PomodoroModalProps) {
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(() => {
    const requestedTaskExists = items.some((item) => item.id === initialTaskId);
    return requestedTaskExists ? initialTaskId! : (items[0]?.id ?? "");
  });
  const [sessionTaskId, setSessionTaskId] = useState("");
  const taskId = selectedTaskId;
  const completing = useRef(false);
  const completedSession = useRef(false);
  const deadline = useRef<number | null>(null);

  const selectedTask = useMemo(
    () => items.find((item) => item.id === taskId) ?? null,
    [items, taskId],
  );

  useEffect(() => {
    if (!running) return;

    const updateRemainingTime = () => {
      if (deadline.current === null) return;
      const remaining = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setSeconds(remaining);
    };

    updateRemainingTime();
    const id = window.setInterval(updateRemainingTime, 250);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (seconds !== 0 || completing.current || completedSession.current) return;
    setRunning(false);
    deadline.current = null;
    completedSession.current = true;
    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      oscillator.connect(context.destination);
      oscillator.frequency.value = 880;
      oscillator.start();
      oscillator.stop(context.currentTime + 0.25);
    } catch {
      // Audio can be unavailable when browser autoplay policies block it.
    }
    if (mode === "focus" && sessionTaskId) {
      completing.current = true;
      void onComplete(sessionTaskId, 25).finally(() => {
        completing.current = false;
      });
    }
  }, [seconds, mode, sessionTaskId, onComplete]);

  function chooseMode(next: "focus" | "break") {
    setMode(next);
    setSeconds(next === "focus" ? 25 * 60 : 5 * 60);
    setRunning(false);
    setSessionTaskId("");
    deadline.current = null;
    completedSession.current = false;
  }

  function reset() {
    setSeconds(mode === "focus" ? 25 * 60 : 5 * 60);
    setRunning(false);
    setSessionTaskId("");
    deadline.current = null;
    completedSession.current = false;
  }

  function toggleTimer() {
    if (running) {
      deadline.current = null;
      setRunning(false);
      return;
    }

    if (mode === "focus") setSessionTaskId(taskId);
    deadline.current = Date.now() + seconds * 1000;
    completedSession.current = false;
    setRunning(true);
  }

  const display = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pomodoro Focus"
      description="25 phút tập trung · 5 phút nghỉ"
      width="max-w-md"
      confirmClose={running}
    >
      <div className="text-center">
        <div className="mx-auto inline-grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-bold">
          <button
            type="button"
            aria-pressed={mode === "focus"}
            className={`rounded-lg px-4 py-2 ${mode === "focus" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}
            onClick={() => chooseMode("focus")}
          >
            Tập trung
          </button>
          <button
            type="button"
            aria-pressed={mode === "break"}
            className={`rounded-lg px-4 py-2 ${mode === "break" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"}`}
            onClick={() => chooseMode("break")}
          >
            Nghỉ ngơi
          </button>
        </div>
        <div className="my-8">
          <p className="font-mono text-6xl font-black tracking-tight text-slate-950">{display}</p>
          <p className="mt-2 text-sm text-slate-500">
            {mode === "focus"
              ? "Tập trung vào một nhiệm vụ duy nhất."
              : "Rời màn hình, uống nước và thư giãn."}
          </p>
          {mode === "focus" && selectedTask && (
            <p className="mt-3 rounded-xl bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-800">
              Đang tập trung: {selectedTask.title}
            </p>
          )}
        </div>
        <Select
          value={taskId}
          onChange={(event) => setSelectedTaskId(event.target.value)}
          disabled={running || mode === "break"}
        >
          <option value="">Chọn nhiệm vụ</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </Select>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" onClick={reset}>
            <RotateCcw className="size-4" />
            Reset
          </Button>
          <Button
            className="min-w-32"
            onClick={toggleTimer}
            disabled={seconds === 0 || (mode === "focus" && !taskId)}
          >
            {running ? (
              <>
                <Pause className="size-4" />
                Tạm dừng
              </>
            ) : (
              <>
                <Play className="size-4" />
                Bắt đầu
              </>
            )}
          </Button>
        </div>
        <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <TimerReset className="size-3" />
          Hoàn thành phiên tập trung sẽ tự động cộng 25 phút thực tế.
        </p>
      </div>
    </Modal>
  );
}
