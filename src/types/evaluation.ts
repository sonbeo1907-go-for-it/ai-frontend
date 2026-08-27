export type WeakTopicStatus = "UNRESOLVED" | "IN_REVIEW" | "MASTERED";

export type WeakTopicTrigger = "QUIZ_FAILED" | "LOW_RATING" | "BOTH";

export type QuizType = "DAILY_MICRO_QUIZ" | "MASTERY_CHECK";

export type QuizStatus = "GENERATED" | "SUBMITTED";

export interface QuizOption {
  key: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  roadmapItemId?: string;
  questionText: string;
  options: QuizOption[];
  correctOption?: string;
  userAnswer?: string;
  isCorrect?: boolean;
  explanation?: string;
}

export interface QuizDetail {
  id: string;
  dailyPlanId?: string;
  roadmapId: string;
  quizType: QuizType;
  status: QuizStatus;
  score?: number;
  passed?: boolean;
  submittedAt?: string;
  questions: QuizQuestion[];
}

export interface AnswerSubmission {
  questionId: string;
  selectedOption: string;
}

export interface SubmitQuizPayload {
  answers: AnswerSubmission[];
}

export interface SelfEvaluationPayload {
  overallRating: number;
  feedbackNote?: string;
}

export interface DailyEvaluation {
  id: string;
  dailyPlanId: string;
  evaluationDate: string;
  quizScore?: number;
  quizPassed?: boolean;
  overallRating?: number;
  feedbackNote?: string;
  createdAt: string;
}

export interface WeakTopic {
  id: string;
  roadmapId: string;
  roadmapItemId: string;
  topicTitle?: string;
  milestoneTitle?: string;
  status: WeakTopicStatus;
  triggerSource: WeakTopicTrigger;
  lastQuizScore?: number;
  lastUnderstandingRating?: number;
  unresolvedAt: string;
  masteredAt?: string;
}

export interface MasteryCheckResult {
  weakTopicId: string;
  quizScore: number;
  isMastered: boolean;
  weakTopicStatus: WeakTopicStatus;
  message: string;
}
