'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ChatSession, ChatSessionDetail, ChatResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const AUTH_FETCH_OPTIONS: RequestInit = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
};

// --- API functions ---

async function fetchSessions(): Promise<ChatSession[]> {
  const res = await fetch(`${API_URL}/api/chat/sessions`, AUTH_FETCH_OPTIONS);
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return res.json();
}

async function fetchSessionDetail(sessionId: string): Promise<ChatSessionDetail> {
  const res = await fetch(`${API_URL}/api/chat/sessions/${sessionId}`, AUTH_FETCH_OPTIONS);
  if (!res.ok) throw new Error('Failed to fetch session');
  return res.json();
}

async function createSession(classId?: string): Promise<ChatSession> {
  const res = await fetch(`${API_URL}/api/chat/sessions`, {
    method: 'POST',
    ...AUTH_FETCH_OPTIONS,
    body: JSON.stringify({ class_id: classId ?? null }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create session');
  }
  return res.json();
}

async function sendMessage(
  sessionId: string,
  content: string,
  documentId?: number
): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/api/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    ...AUTH_FETCH_OPTIONS,
    body: JSON.stringify({ content, document_id: documentId ?? null }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to send message');
  }
  return res.json();
}

async function endSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/chat/sessions/${sessionId}`, {
    method: 'DELETE',
    ...AUTH_FETCH_OPTIONS,
  });
  if (!res.ok && res.status !== 204) throw new Error('Failed to end session');
}

// --- Hooks ---

export function useChatSessions() {
  return useQuery({
    queryKey: ['chat-sessions'],
    queryFn: fetchSessions,
  });
}

export function useChatSessionDetail(sessionId: string | null) {
  return useQuery({
    queryKey: ['chat-session', sessionId],
    queryFn: () => fetchSessionDetail(sessionId!),
    enabled: !!sessionId,
  });
}

export function useCreateChatSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (classId?: string) => createSession(classId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
    },
  });
}

export function useSendMessage(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ content, documentId }: { content: string; documentId?: number }) =>
      sendMessage(sessionId, content, documentId),
    onSuccess: (data) => {
      queryClient.setQueryData<ChatSessionDetail>(['chat-session', sessionId], (old) => {
        if (!old) return old;
        return {
          ...old,
          messages: [...old.messages, data.user_message, data.assistant_message],
        };
      });
    },
  });
}

export function useEndChatSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => endSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
    },
  });
}
