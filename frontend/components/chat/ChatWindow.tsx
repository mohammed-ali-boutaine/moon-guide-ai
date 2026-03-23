'use client';

import { useState, useEffect } from 'react';
import {
  useChatSessions,
  useChatSessionDetail,
  useCreateChatSession,
  useSendMessage,
} from '@/hooks/use-chat';
import SessionSidebar from './SessionSidebar';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { LoadingSpinner } from '@/components/ui';

interface ChatWindowProps {
  classId?: string;          // present for class chat
  documentId?: number;       // present for personal doc chat
  title?: string;
}

export default function ChatWindow({ classId, documentId, title }: ChatWindowProps) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data: sessions = [], isLoading: sessionsLoading } = useChatSessions();
  const { data: sessionDetail, isLoading: detailLoading } = useChatSessionDetail(activeSessionId);
  const createSession = useCreateChatSession();
  const sendMessage = useSendMessage(activeSessionId ?? '');

  // Auto-select the most recent session for this context on mount
  useEffect(() => {
    if (sessionsLoading || sessions.length === 0) return;
    const relevant = sessions.filter((s) =>
      classId ? s.class_id === classId : s.class_id === null
    );
    if (relevant.length > 0 && !activeSessionId) {
      const sorted = [...relevant].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setActiveSessionId(sorted[0].id);
    }
  }, [sessions, sessionsLoading, classId, activeSessionId]);

  async function handleNewSession() {
    const session = await createSession.mutateAsync(classId);
    setActiveSessionId(session.id);
    setInput('');
  }

  async function handleSend() {
    const content = input.trim();
    if (!content || !activeSessionId) return;
    setInput('');
    await sendMessage.mutateAsync({ content, documentId });
  }

  const messages = sessionDetail?.messages ?? [];
  const isSending = sendMessage.isPending;

  return (
    <div className="flex h-full overflow-hidden rounded-xl border border-gray-800">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } transition-all duration-200 overflow-hidden flex-shrink-0`}
      >
        {!sessionsLoading && (
          <SessionSidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelect={setActiveSessionId}
            onNew={handleNewSession}
            isCreating={createSession.isPending}
            classId={classId}
          />
        )}
      </div>

      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0 bg-[#0a0a0f]">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900/50 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-medium text-sm truncate">{title ?? 'AI Assistant'}</h2>
            {activeSessionId && (
              <p className="text-gray-600 text-xs">Session {activeSessionId.slice(0, 8)}</p>
            )}
          </div>
        </div>

        {/* No session state */}
        {!activeSessionId && !sessionsLoading && (
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-white font-medium mb-2">No active conversation</h3>
              <p className="text-gray-500 text-sm mb-4">
                Start a new conversation to ask questions about the course materials.
              </p>
              <button
                onClick={handleNewSession}
                disabled={createSession.isPending}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Start conversation
              </button>
            </div>
          </div>
        )}

        {/* Loading sessions */}
        {sessionsLoading && (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Messages */}
        {activeSessionId && !sessionsLoading && (
          <>
            {detailLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <LoadingSpinner size="md" />
              </div>
            ) : (
              <MessageList messages={messages} isLoading={isSending} />
            )}
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={handleSend}
              isLoading={isSending}
              disabled={detailLoading}
            />
          </>
        )}

        {/* Error display */}
        {sendMessage.isError && (
          <div className="mx-4 mb-3 px-3 py-2 bg-red-900/20 border border-red-700 rounded-lg text-red-400 text-xs">
            {sendMessage.error instanceof Error ? sendMessage.error.message : 'Failed to send message'}
          </div>
        )}
      </div>
    </div>
  );
}
