'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  PaginatedQuizHistory,
  QuizCreateRequest,
  QuizGenerateRequest,
  QuizJobDetailResponse,
  QuizJobResponse,
  QuizResponse,
  QuizUpdateRequest,
} from '@/types/quiz';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const FETCH_OPTS: RequestInit = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
};

// ── API functions ─────────────────────────────────────────────────────────────

async function generateQuiz(body: QuizGenerateRequest): Promise<QuizJobResponse> {
  const res = await fetch(`${API_URL}/api/v1/quiz/generate`, {
    method: 'POST',
    ...FETCH_OPTS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to start quiz generation');
  }
  return res.json();
}

async function pollQuizJob(jobId: string): Promise<QuizJobDetailResponse> {
  const res = await fetch(`${API_URL}/api/v1/quiz/jobs/${jobId}`, FETCH_OPTS);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch job status');
  }
  return res.json();
}

async function fetchQuiz(quizId: number): Promise<QuizResponse> {
  const res = await fetch(`${API_URL}/api/v1/quiz/${quizId}`, FETCH_OPTS);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch quiz');
  }
  return res.json();
}

async function createQuiz(body: QuizCreateRequest): Promise<QuizResponse> {
  const res = await fetch(`${API_URL}/api/v1/quiz`, {
    method: 'POST',
    ...FETCH_OPTS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create quiz');
  }
  return res.json();
}

async function updateQuiz(quizId: number, body: QuizUpdateRequest): Promise<QuizResponse> {
  const res = await fetch(`${API_URL}/api/v1/quiz/${quizId}`, {
    method: 'PATCH',
    ...FETCH_OPTS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update quiz');
  }
  return res.json();
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useGenerateQuiz() {
  return useMutation({ mutationFn: generateQuiz });
}

/** Polls a generation job every 3 s until status is completed or failed. */
export function useQuizJob(jobId: string | null) {
  return useQuery({
    queryKey: ['quiz-job', jobId],
    queryFn: () => pollQuizJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'completed' || status === 'failed' ? false : 3000;
    },
  });
}

export function useQuiz(quizId: number | null) {
  return useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => fetchQuiz(quizId!),
    enabled: !!quizId,
  });
}

export function useCreateQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createQuiz,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-quizzes'] });
    },
  });
}

export function useUpdateQuiz(quizId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: QuizUpdateRequest) => updateQuiz(quizId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quiz', quizId] });
      qc.invalidateQueries({ queryKey: ['teacher-quizzes'] });
    },
  });
}

// ── Quiz history ──────────────────────────────────────────────────────────────

async function fetchQuizHistory(
  page: number,
  pageSize: number,
  classId: string | null,
  sortOrder: 'asc' | 'desc',
): Promise<PaginatedQuizHistory> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    sort_order: sortOrder,
  });
  if (classId) params.set('class_id', classId);

  const res = await fetch(
    `${API_URL}/api/v1/students/me/quiz-history?${params}`,
    FETCH_OPTS,
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch quiz history');
  }
  return res.json();
}

export function useQuizHistory(
  page: number,
  pageSize: number,
  classId: string | null,
  sortOrder: 'asc' | 'desc',
) {
  return useQuery({
    queryKey: ['quiz-history', page, pageSize, classId, sortOrder],
    queryFn: () => fetchQuizHistory(page, pageSize, classId, sortOrder),
    staleTime: 30_000,
  });
}
