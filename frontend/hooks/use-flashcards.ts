'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  FlashcardGenerateResponse,
  FlashcardListResponse,
  FlashcardResponse,
  FlashcardReviewResponse,
  FlashcardWithProgress,
} from '@/types/flashcard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const OPTS: RequestInit = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
};

// ── API functions ──────────────────────────────────────────────────────────────

async function fetchFlashcards(documentId: number): Promise<FlashcardListResponse> {
  const res = await fetch(`${API_URL}/api/flashcards/?document_id=${documentId}`, OPTS);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch flashcards');
  }
  return res.json();
}

async function generateFlashcards(documentId: number, count: number): Promise<FlashcardGenerateResponse> {
  const res = await fetch(`${API_URL}/api/flashcards/generate`, {
    method: 'POST',
    ...OPTS,
    body: JSON.stringify({ document_id: documentId, count }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to generate flashcards');
  }
  return res.json();
}

async function fetchStudyCards(documentId: number, limit = 20): Promise<FlashcardWithProgress[]> {
  const res = await fetch(
    `${API_URL}/api/flashcards/study?document_id=${documentId}&limit=${limit}`,
    OPTS,
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to load study session');
  }
  return res.json();
}

async function reviewFlashcard(
  flashcardId: number,
  rating: number,
): Promise<FlashcardReviewResponse> {
  const res = await fetch(`${API_URL}/api/flashcards/${flashcardId}/review`, {
    method: 'POST',
    ...OPTS,
    body: JSON.stringify({ rating }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to record review');
  }
  return res.json();
}

async function deleteFlashcard(flashcardId: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/flashcards/${flashcardId}`, {
    method: 'DELETE',
    ...OPTS,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to delete flashcard');
  }
}

async function createFlashcard(
  documentId: number,
  front: string,
  back: string,
): Promise<FlashcardResponse> {
  const res = await fetch(`${API_URL}/api/flashcards/`, {
    method: 'POST',
    ...OPTS,
    body: JSON.stringify({ document_id: documentId, front, back }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create flashcard');
  }
  return res.json();
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

export function useFlashcards(documentId: number | null) {
  return useQuery({
    queryKey: ['flashcards', documentId],
    queryFn: () => fetchFlashcards(documentId!),
    enabled: !!documentId,
    staleTime: 60_000,
  });
}

export function useGenerateFlashcards() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, count }: { documentId: number; count: number }) =>
      generateFlashcards(documentId, count),
    onSuccess: (_, { documentId }) => {
      qc.invalidateQueries({ queryKey: ['flashcards', documentId] });
      qc.invalidateQueries({ queryKey: ['flashcards-study', documentId] });
    },
  });
}

export function useStudyCards(documentId: number | null, limit = 20) {
  return useQuery({
    queryKey: ['flashcards-study', documentId, limit],
    queryFn: () => fetchStudyCards(documentId!, limit),
    enabled: !!documentId,
    staleTime: 0,
  });
}

export function useReviewFlashcard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ flashcardId, rating }: { flashcardId: number; rating: number }) =>
      reviewFlashcard(flashcardId, rating),
    onSuccess: (_, { flashcardId }) => {
      qc.invalidateQueries({ queryKey: ['flashcards-study'] });
    },
  });
}

export function useDeleteFlashcard(documentId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteFlashcard,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flashcards', documentId] });
    },
  });
}

export function useCreateFlashcard(documentId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ front, back }: { front: string; back: string }) =>
      createFlashcard(documentId!, front, back),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flashcards', documentId] });
    },
  });
}
