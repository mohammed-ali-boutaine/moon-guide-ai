export type QuizDifficulty = 'easy' | 'medium' | 'hard';
export type QuizStatus = 'draft' | 'published' | 'archived';
export type QuestionType = 'MCQ' | 'TrueFalse' | 'ShortAnswer';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

// ── API response shapes (mirror backend schemas) ──────────────────────────────

export interface AnswerResponse {
  id: number;
  text: string;
  is_correct: boolean;
  order: number;
}

export interface QuestionResponse {
  id: number;
  type: QuestionType;
  text: string;
  order: number;
  answers: AnswerResponse[];
}

export interface QuizResponse {
  id: number;
  title: string;
  description: string | null;
  difficulty: QuizDifficulty | null;
  document_id: number | null;
  class_id: string | null;
  status: QuizStatus;
  duration_minutes: number | null;
  max_attempts: number | null;
  questions: QuestionResponse[];
  created_at: string;
  updated_at: string;
}

export interface QuizJobResponse {
  job_id: string;
  status: JobStatus;
  document_id: number;
  num_questions: number;
  difficulty: QuizDifficulty;
  created_at: string;
}

export interface QuizJobDetailResponse {
  job_id: string;
  status: JobStatus;
  document_id: number;
  quiz_id: number | null;
  num_questions: number;
  difficulty: QuizDifficulty;
  error_message: string | null;
  total_tokens: number | null;
  created_at: string;
  updated_at: string;
}

// ── Client-side editing shapes ────────────────────────────────────────────────

export interface LocalAnswer {
  localId: string; // temp client key
  id?: number;
  text: string;
  is_correct: boolean;
  order: number;
}

export interface LocalQuestion {
  localId: string; // temp client key
  id?: number;
  type: QuestionType;
  text: string;
  order: number;
  answers: LocalAnswer[];
}

export interface QuizFormData {
  title: string;
  description: string;
  duration_minutes: string;
  max_attempts: string;
  difficulty: QuizDifficulty;
}

// ── Request shapes ────────────────────────────────────────────────────────────

export interface QuizGenerateRequest {
  document_id: number;
  num_questions: number;
  difficulty: QuizDifficulty;
}

export interface QuizCreateRequest {
  class_id?: string;
  title: string;
  description?: string;
  difficulty?: QuizDifficulty;
  duration_minutes?: number;
  max_attempts?: number;
  questions: Array<{
    type: QuestionType;
    text: string;
    order: number;
    answers: Array<{ text: string; is_correct: boolean; order: number }>;
  }>;
}

export interface QuizUpdateRequest {
  title?: string;
  description?: string;
  status?: QuizStatus;
  difficulty?: QuizDifficulty;
  duration_minutes?: number;
  max_attempts?: number;
}

// ── Attempt shapes ────────────────────────────────────────────────────────────

export type AttemptStatus = 'started' | 'in_progress' | 'submitted';

export interface QuizAttemptStartResponse {
  attempt_id: number;
  quiz_id: number;
  status: AttemptStatus;
  started_at: string;
  expires_at: string | null;
}

export interface StudentAnswerSubmit {
  question_id: number;
  answer_text: string | null;
}

export interface QuizSubmitRequest {
  answers: StudentAnswerSubmit[];
}

export interface QuizAttemptSubmitResponse {
  attempt_id: number;
  quiz_id: number;
  status: AttemptStatus;
  submitted_at: string;
  total_questions: number;
  answers_recorded: number;
}

// ── Quiz history ──────────────────────────────────────────────────────────────

export interface QuizHistoryItem {
  attempt_id: number;
  quiz_id: number;
  quiz_title: string;
  quiz_difficulty: string | null;
  class_id: string | null;
  class_name: string | null;
  score: number | null;
  status: string;
  started_at: string;
  submitted_at: string | null;
}

export interface PaginatedQuizHistory {
  items: QuizHistoryItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
