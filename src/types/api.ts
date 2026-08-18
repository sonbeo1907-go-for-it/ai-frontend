export type UserRole = "USER" | "ADMIN";
export type AccountStatus = "ACTIVE" | "INACTIVE" | "LOCKED";
export type ProficiencyLevel = "BEGINNER" | "BASIC" | "INTERMEDIATE";
export type RoadmapStatus = "ONBOARDING" | "DRAFT" | "ACTIVE" | "ARCHIVED";
export type VersionStatus = "DRAFT" | "ACTIVE" | "SUPERSEDED";
export type MaterialType = "FILE" | "TEXT" | "GOAL_DESCRIPTION";
export type MaterialStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";
export type DailyPlanStatus = "DRAFT" | "READY" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type DailyTaskCategory = "REVIEW" | "NEW_MATERIAL" | "PRACTICE" | "CUSTOM";
export type DailyTaskStatus =
  "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "PARTIALLY_COMPLETED" | "SKIPPED";
export type ProgressEntryStatus = "COMPLETED" | "PARTIALLY_COMPLETED" | "SKIPPED";

export interface ApiResponse<T> {
  data: T;
}
export interface FieldViolation {
  field: string;
  message: string;
}
export interface ApiErrorBody {
  timestamp?: string;
  status: number;
  code: string;
  message: string;
  path?: string;
  requestId?: string;
  violations?: FieldViolation[];
}
export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}
export interface ProfileDetails {
  displayName: string;
  timeZone: string;
  locale: string;
  defaultDailyMinutes: number;
  setupCompleted: boolean;
  setupCompletedAt?: string;
}
export interface ProfileResponse {
  id: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  profile: ProfileDetails | null;
}
export interface RoadmapOnboarding {
  roadmapId: string;
  version: number;
  status: RoadmapStatus;
  goal?: string;
  proficiencyLevel?: ProficiencyLevel;
  dailyCommitmentMinutes?: number;
  expectedDurationDays?: number;
  completed: boolean;
  completedAt?: string;
}
export interface RoadmapItem {
  id: string;
  version: number;
  itemType: "MILESTONE" | "TOPIC";
  parentItemId?: string;
  title: string;
  description?: string;
  orderIndex: number;
  estimatedMinutes?: number;
  topics: RoadmapItem[];
}
export interface RoadmapVersion {
  id: string;
  entityVersion: number;
  versionNumber: number;
  status: VersionStatus;
  origin: "MANUAL" | "USER_EDITED";
  activatedAt?: string;
  milestones: RoadmapItem[];
  createdAt: string;
  updatedAt: string;
}
export interface Roadmap {
  id: string;
  version: number;
  title: string;
  description?: string;
  status: RoadmapStatus;
  activeVersionId?: string;
  versions: RoadmapVersion[];
  createdAt: string;
  updatedAt: string;
}
export interface Material {
  id: string;
  type: MaterialType;
  status: MaterialStatus;
  originalFileName?: string;
  contentType?: string;
  fileSize?: number;
  content?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt?: string;
}
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}
export interface DailyPlanItem {
  id: string;
  versionId: string;
  category: DailyTaskCategory;
  title: string;
  description?: string;
  plannedMinutes?: number;
  orderIndex?: number;
  status: DailyTaskStatus;
  completedAt?: string;
  createdAt: string;
  roadmapItemId?: string;
}
export interface DailyPlanVersion {
  id: string;
  entityVersion: number;
  dailyPlanId: string;
  versionNumber: number;
  status: VersionStatus;
  origin: "MANUAL" | "AI_GENERATED" | "AI_REGENERATED" | "USER_EDITED";
  availableMinutes: number;
  totalPlannedMinutes: number;
  activatedAt?: string;
  supersededAt?: string;
  items: DailyPlanItem[];
  createdAt: string;
  updatedAt: string;
}
export interface DailyPlan {
  id: string;
  userId: string;
  planDate: string;
  timeZoneSnapshot: string;
  status: DailyPlanStatus;
  activeVersionId?: string;
  latestVersionId: string;
  availableMinutes: number;
  totalPlannedMinutes: number;
  totalItemsCount: number;
  completedItemsCount: number;
  completionPercentage: number;
  items: DailyPlanItem[];
  createdAt: string;
  updatedAt: string;
  roadmapId?: string;
}
