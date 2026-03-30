'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AttemptResultResponse } from '@/types/quiz';

const FETCH_OPTS: RequestInit = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
};

// ── API functions ─────────────────────────────────────────────────────────────

async function fetchAttemptResults(attemptId: number): Promise<AttemptResultResponse> {
  const res = await fetch(`/api/quiz/${attemptId}/results`, FETCH_OPTS);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to load results');
  }
  return res.json();
}

async function requestFeedback(attemptId: number): Promise<void> {
  const res = await fetch(`/api/quiz/${attemptId}/generate-feedback`, {
    method: 'POST',
    ...FETCH_OPTS,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to request feedback');
  }
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useAttemptResults(attemptId: number) {
  return useQuery<AttemptResultResponse, Error>({
    queryKey: ['quiz-results', attemptId],
    queryFn: () => fetchAttemptResults(attemptId),
    enabled: attemptId > 0,
    staleTime: 30_000,
  });
}

/**
 * Poll results until feedback is generated (feedback_generated becomes true).
 * Used on the results page to auto-refresh after requesting feedback.
 */
export function useAttemptResultsPolling(attemptId: number, enabled: boolean) {
  return useQuery<AttemptResultResponse, Error>({
    queryKey: ['quiz-results-poll', attemptId],
    queryFn: () => fetchAttemptResults(attemptId),
    enabled: enabled && attemptId > 0,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || data.feedback_generated) return false;
      return 4000;
    },
    staleTime: 0,
  });
}

export function useGenerateFeedback(attemptId: number) {
  const queryClient = useQueryClient();
  return useMutation<void, Error>({
    mutationFn: () => requestFeedback(attemptId),
    onSuccess: () => {
      // Invalidate so the polling query picks up the new state
      queryClient.invalidateQueries({ queryKey: ['quiz-results', attemptId] });
      queryClient.invalidateQueries({ queryKey: ['quiz-results-poll', attemptId] });
    },
  });
}
