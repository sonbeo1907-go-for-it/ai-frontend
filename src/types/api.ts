import type { WeakTopicStatus, WeakTopicTrigger } from "./evaluation";

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
export type RoadmapItemProgressStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type RoadmapItemType = "MILESTONE" | "TOPIC" | "LEARNING_UNIT";
export type AiProviderProtocol = "OPENAI_COMPATIBLE";
export type CredentialSelectionStrategy = "PRIORITY";
export type AiPurpose =
  | "DOCUMENT_EXTRACTION"
  | "ROADMAP_GENERATION"
  | "DAILY_PLAN_GENERATION"
  | "DAILY_PLAN_REVIEW"
  | "QUIZ_GENERATION"
  | "TASK_GUIDANCE_GENERATION";
export type AiAdjustmentAction = "CARRY_OVER" | "SPLIT" | "RESCHEDULE" | "DROP";
export type AiExecutionStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
export type AiExecutionOperation = "GENERATE" | "REGENERATE";
export type AiExecutionTargetType =
  | "ROADMAP"
  | "DAILY_PLAN"
  | "DAILY_PLAN_VERSION"
  | "DAILY_PLAN_ITEM"
  | "WEAK_TOPIC";
export type AiExecutionResultType =
  | "ROADMAP_VERSION"
  | "DAILY_PLAN_VERSION"
  | "TASK_GUIDANCE_REVISION"
  | "QUIZ";

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
export interface AiExecution {
  id: string;
  entityVersion: number;
  providerConfigId: string;
  purpose: AiPurpose;
  operation: AiExecutionOperation;
  targetType: AiExecutionTargetType;
  targetId: string;
  status: AiExecutionStatus;
  resultType?: AiExecutionResultType;
  resultId?: string;
  attemptCount: number;
  failureCode?: string;
  failureMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
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
  itemType: RoadmapItemType;
  parentItemId?: string;
  title: string;
  description?: string;
  orderIndex: number;
  estimatedMinutes?: number;
  topics: RoadmapItem[];
  learningUnits: RoadmapItem[];
  progress?: RoadmapItemProgress | null;
}

export interface RoadmapItemProgress {
  completionState: RoadmapItemProgressStatus;
  latestOutcome?: ProgressEntryStatus | null;
  completionPercentage: number;
  completedLearningUnits?: number | null;
  totalLearningUnits?: number | null;
}

export interface RoadmapProgressSummary {
  roadmapVersionId: string;
  completedTopics: number;
  totalTopics: number;
  completionPercentage: number;
}

export interface RoadmapProgress extends RoadmapProgressSummary {
  roadmapId: string;
  topics: RoadmapTopicProgress[];
}

export interface RoadmapTopicProgress {
  roadmapItemId: string;
  title: string;
  status: RoadmapItemProgressStatus;
  completionPercentage: number;
  completedLearningUnits: number;
  totalLearningUnits: number;
  learningUnits: RoadmapLearningUnitProgress[];
}

export interface RoadmapLearningUnitProgress {
  roadmapItemId: string;
  title: string;
  status: RoadmapItemProgressStatus;
  latestOutcome?: ProgressEntryStatus | null;
  completionPercentage: number;
}
export interface RoadmapVersion {
  id: string;
  entityVersion: number;
  versionNumber: number;
  status: VersionStatus;
  origin: "MANUAL" | "USER_EDITED" | "AI_GENERATED" | "AI_REGENERATED";
  activatedAt?: string;
  milestones: RoadmapItem[];
  createdAt: string;
  updatedAt: string;
}
export interface Roadmap {
  id: string;
  entityVersion: number;
  title: string;
  description?: string;
  status: RoadmapStatus;
  activeVersionId?: string;
  versions: RoadmapVersion[];
  progress?: RoadmapProgressSummary | null;
  createdAt: string;
  updatedAt: string;
}
export interface RoadmapSummary {
  id: string;
  entityVersion: number;
  title: string;
  description?: string;
  status: RoadmapStatus;
  activeVersionId?: string;
  versionCount: number;
  latestVersionNumber?: number;
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
  page: number;
  totalElements: number;
  totalPages: number;
  size: number;
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
  roadmapItemTitle?: string;
  learningUnitId?: string;
  learningUnitTitle?: string;
  parentTopicId?: string;
  parentTopicTitle?: string;
  roadmapItem?: RoadmapItemReference | null;
  studyUnit?: StudyUnitReference | null;
  aiAdjustmentAction?: AiAdjustmentAction | null;
  aiAdjustmentReason?: string | null;
  steps: DailyPlanTaskStep[];
  stepProgress: TaskStepProgress;
}

export interface DailyPlanTaskStep {
  id: string;
  entityVersion: number;
  dailyPlanItemId: string;
  title: string;
  guidance?: string | null;
  orderIndex: number;
  estimatedMinutes?: number | null;
  required: boolean;
  completed: boolean;
  completedAt?: string | null;
  stateVersion?: number | null;
}

export interface TaskStepProgress {
  requiredCount: number;
  completedRequiredCount: number;
  completionPercentage: number;
  allRequiredStepsCompleted: boolean;
}

export interface DailyPlanTaskStepsResponse {
  dailyPlanItemId: string;
  steps: DailyPlanTaskStep[];
  progress: TaskStepProgress;
}

export type TaskGuidanceRevisionStatus = "DRAFT" | "SUPERSEDED" | "ARCHIVED";

export type GuidanceReferenceProvenance =
  | "MATERIAL"
  | "LEARNING_SOURCE"
  | "ROADMAP_CONTEXT"
  | "UNVERIFIED_EXTERNAL";

export interface TaskGuidanceReference {
  id: string;
  provenance: GuidanceReferenceProvenance;
  displayLabel: string;
  locator?: string | null;
  targetId?: string | null;
  externalUrl?: string | null;
  unverified: boolean;
}

export interface TaskStepGuidance {
  id: string;
  taskStepId: string;
  taskStepEntityVersion: number;
  orderIndex: number;
  instructions: string;
  expectedResult: string;
  tips?: string | null;
  cautions?: string | null;
  prerequisites?: string | null;
  references: TaskGuidanceReference[];
}

export interface TaskGuidanceRevision {
  guidanceId: string;
  revisionId: string;
  dailyPlanVersionId: string;
  dailyPlanItemId: string;
  revisionNumber: number;
  status: TaskGuidanceRevisionStatus;
  latest: boolean;
  stale: boolean;
  objective: string;
  taskSummary: string;
  stepGuidances: TaskStepGuidance[];
  references: TaskGuidanceReference[];
  generatedAt: string;
}

export interface TaskGuidanceRevisionSummary {
  revisionId: string;
  revisionNumber: number;
  status: TaskGuidanceRevisionStatus;
  latest: boolean;
  stale: boolean;
  objective: string;
  generatedAt: string;
}

export interface TaskGuidanceOverview {
  guidanceId: string;
  dailyPlanVersionId: string;
  dailyPlanItemId: string;
  latestRevision: TaskGuidanceRevision;
  revisions: PageResponse<TaskGuidanceRevisionSummary>;
}

export interface RoadmapItemReference {
  id: string;
  title: string;
}

export interface StudyUnitReference {
  id: string;
  title: string;
}

export interface AvailableLearningUnit {
  id: string;
  title: string;
  description?: string;
  estimatedMinutes?: number;
  orderIndex: number;
  topicId: string;
  topicTitle: string;
  milestoneId: string;
  milestoneTitle: string;
  progressStatus: RoadmapItemProgressStatus;
  latestOutcome?: ProgressEntryStatus | null;
}

export interface ProgressEntry {
  id: string;
  dailyPlanItemId?: string;
  roadmapVersionId?: string;
  learningUnitId?: string;
  status: ProgressEntryStatus;
  actualMinutes: number;
  completionPercentage: number;
  actualResult?: string;
  difficulty?: number;
  understandingRating?: number;
  note?: string;
  supersedesEntryId?: string;
  recordedAt: string;
}

export interface DailyPlanTaskProgressHistory {
  dailyPlanItemId: string;
  dailyPlanVersionId: string;
  taskTitle: string;
  removedAt?: string | null;
  entries: ProgressEntry[];
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
  aiExplanation?: string | null;
  requiresUserDecision?: boolean | null;
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
export interface DailyPlanSummary {
  id: string;
  planDate: string;
  timeZoneSnapshot: string;
  status: DailyPlanStatus;
  activeVersionId?: string;
  latestVersionId?: string;
  availableMinutes: number;
  totalPlannedMinutes: number;
  totalItemsCount: number;
  completedItemsCount: number;
  partiallyCompletedItemsCount: number;
  skippedItemsCount: number;
  completionPercentage: number;
  roadmapId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiProviderConfig {
  id: string;
  version: number;
  providerId: string;
  providerCode: string;
  providerDisplayName: string;
  protocol: AiProviderProtocol;
  baseUrl: string;
  purpose: AiPurpose;
  model: string;
  enabled: boolean;
  defaultProvider: boolean;
  timeoutSeconds: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  temperature: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiProviderConfigInput {
  providerId: string;
  purpose: AiPurpose;
  model: string;
  enabled: boolean;
  defaultProvider: boolean;
  timeoutSeconds: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  temperature: number;
}

export interface UpdateAiProviderConfigInput {
  version: number;
  model: string;
  timeoutSeconds: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  temperature: number;
}

export interface AiProviderConnectionTestResult {
  configId: string;
  providerId: string;
  providerCode: string;
  purpose: AiPurpose;
  model: string;
  credentialId?: string;
  credentialLabel?: string;
  success: boolean;
  latencyMs: number;
  failureCategory?: string;
  message: string;
  testedAt: string;
}

export interface AiProviderCredential {
  id: string;
  version: number;
  providerId: string;
  label: string;
  secretRef: string;
  priority: number;
  enabled: boolean;
  secretConfigured: boolean;
  maskedSecret?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiProvider {
  id: string;
  version: number;
  code: string;
  displayName: string;
  baseUrl: string;
  protocol: AiProviderProtocol;
  credentialStrategy: CredentialSelectionStrategy;
  enabled: boolean;
  credentials: AiProviderCredential[];
  createdAt: string;
  updatedAt: string;
}

export interface InitialAiProviderCredentialInput {
  label: string;
  secretRef: string;
  priority: number;
  enabled: boolean;
}

export interface CreateAiProviderInput {
  code: string;
  displayName: string;
  baseUrl: string;
  protocol: AiProviderProtocol;
  credentialStrategy: CredentialSelectionStrategy;
  enabled: boolean;
  initialCredential?: InitialAiProviderCredentialInput;
}

export interface UpdateAiProviderInput {
  version: number;
  displayName: string;
  baseUrl: string;
  protocol: AiProviderProtocol;
  credentialStrategy: CredentialSelectionStrategy;
}

export interface CreateAiProviderCredentialInput {
  label: string;
  secretRef: string;
  priority: number;
  enabled: boolean;
}

export interface UpdateAiProviderCredentialInput {
  version: number;
  label: string;
  secretRef: string;
  priority: number;
}

export interface MasterPlanProgress {
  roadmapId: string;
  title: string;
  completionPercentage: number;
  completedTopics: number;
  totalTopics: number;
  completedLearningUnits: number;
  totalLearningUnits: number;
}

export interface StreakProgress {
  currentStreak: number;
  longestStreak: number;
  isActiveToday: boolean;
  lastActiveDate: string | null;
  timeZone: string;
}

export interface DailyStudyTimePoint {
  date: string;
  dayOfWeek: string;
  studyMinutes: number;
  completedTasks: number;
  targetMinutes: number;
}

export interface StudyTimeProgress {
  totalStudyMinutes: number;
  totalStudyHours: number;
  dailyPoints: DailyStudyTimePoint[];
}

export interface DashboardReport {
  masterPlan: MasterPlanProgress | null;
  streak: StreakProgress;
  studyTime: StudyTimeProgress;
}

export interface KnowledgeLearningUnit {
  id: string;
  title: string;
  description?: string | null;
  orderIndex: number;
  estimatedMinutes: number;
  mastered: boolean;
  status: RoadmapItemProgressStatus;
  masteredAt?: string | null;
  unresolvedWeakTopic: boolean;
}

export interface KnowledgeTopic {
  id: string;
  title: string;
  description?: string | null;
  orderIndex: number;
  estimatedMinutes: number;
  mastered: boolean;
  status: RoadmapItemProgressStatus;
  completionPercentage: number;
  masteredAt?: string | null;
  learningUnits: KnowledgeLearningUnit[];
}

export interface KnowledgeMilestone {
  id: string;
  title: string;
  description?: string | null;
  orderIndex: number;
  topics: KnowledgeTopic[];
}

export interface KnowledgeMapResponse {
  roadmapId: string | null;
  roadmapTitle: string | null;
  totalMilestones: number;
  totalTopics: number;
  masteredTopics: number;
  totalLearningUnits: number;
  masteredLearningUnits: number;
  masteryPercentage: number;
  milestones: KnowledgeMilestone[];
}

export interface WeakTopicTimelineItem {
  weakTopicId: string;
  roadmapId: string;
  roadmapTitle: string;
  learningUnitId: string;
  learningUnitTitle: string;
  topicId?: string | null;
  topicTitle?: string | null;
  milestoneId?: string | null;
  milestoneTitle?: string | null;
  status: WeakTopicStatus;
  triggerSource: WeakTopicTrigger;
  lastQuizScore?: number | null;
  lastUnderstandingRating?: number | null;
  unresolvedAt: string;
  masteredAt?: string | null;
  daysToMaster?: number | null;
}

export * from "./evaluation";
