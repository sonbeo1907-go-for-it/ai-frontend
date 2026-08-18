export type TaskStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface ChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface TaskDocument {
  id: string;
  fileName: string;
  fileType: "PDF" | "DOCX" | "IMAGE" | "FIGMA" | "LINK" | "SPREADSHEET";
  url: string;
}

export interface PlanTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  description: string;
  dueDate: string;
  category: string;
  estimatedMinutes: number;
  checklist: ChecklistItem[];
  documents: TaskDocument[];
}

export interface MasterPlanMilestone {
  id: string;
  title: string;
  description: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  orderIndex: number;
  progress: number;
  tasks: PlanTask[];
}

export interface DailyPlanEntry {
  id: string;
  date: string;
  availableMinutes: number;
  totalPlannedMinutes: number;
  tasks: PlanTask[];
}
