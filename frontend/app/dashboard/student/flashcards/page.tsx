'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { usePersonalDocuments } from '@/hooks/use-documents';
import { useFlashcards, useGenerateFlashcards, useDeleteFlashcard } from '@/hooks/use-flashcards';
import type { Document } from '@/types';

// ── Per-document flashcard panel ──────────────────────────────────────────────

function DocumentFlashcardPanel({ doc }: { doc: Document }) {
  const [expanded, setExpanded] = useState(false);
  const [count, setCount] = useState(10);
  const { data, isLoading } = useFlashcards(expanded ? doc.id : null);
  const generate = useGenerateFlashcards();
  const deleteCard = useDeleteFlashcard(doc.id);

  const cards = data?.items ?? [];

  async function handleGenerate() {
    try {
      await generate.mutateAsync({ documentId: doc.id, count });
    } catch {
      // error shown inline
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteCard.mutateAsync(id);
    } catch {
      // ignore
    }
  }

  const isReady = doc.status === 'ready';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/50 transition-colors text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-100 truncate">{doc.filename}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {isReady ? 'Ready' : doc.status}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {data && (
            <span className="text-xs text-primary-400 font-medium">
              {data.total} card{data.total !== 1 ? 's' : ''}
            </span>
          )}
          {data && data.total > 0 && (
            <Link
              href={`/dashboard/student/flashcards/study?document_id=${doc.id}`}
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-1 text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              Study
            </Link>
          )}
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-gray-800 px-5 py-4">
          {!isReady && (
            <p className="text-sm text-yellow-400">Document is still processing.</p>
          )}

          {isReady && (
            <>
              {/* Generate controls */}
              <div className="flex items-center gap-3 mb-4">
                <label className="text-xs text-gray-400">Generate</label>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 focus:outline-none"
                >
                  {[5, 10, 15, 20, 30].map((n) => (
                    <option key={n} value={n}>{n} cards</option>
                  ))}
                </select>
                <button
                  onClick={handleGenerate}
                  disabled={generate.isPending}
                  className="px-3 py-1.5 text-xs font-medium bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {generate.isPending ? 'Generating…' : 'Generate with AI'}
                </button>
                {generate.isError && (
                  <span className="text-xs text-red-400">
                    {generate.error instanceof Error ? generate.error.message : 'Failed'}
                  </span>
                )}
              </div>

              {/* Card list */}
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
                </div>
              ) : cards.length === 0 ? (
                <p className="text-sm text-gray-500 py-2">No flashcards yet. Generate some above.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {cards.map((card) => (
                    <div key={card.id} className="flex items-start gap-3 bg-gray-800 rounded-lg px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-200 truncate">{card.front}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{card.back}</p>
                      </div>
                      <button
                        onClick={() => handleDelete(card.id)}
                        className="shrink-0 p-1 text-gray-600 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FlashcardsPage() {
  const { data, isLoading } = usePersonalDocuments();
  const docs = data?.documents ?? [];
  const readyDocs = docs.filter((d) => d.status === 'ready');

  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <div className="bg-[#0a0a0f] min-h-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100">Flashcards</h1>
            <p className="text-gray-400 mt-1">
              Generate AI flashcards from your documents and study with spaced repetition.
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 mb-3">No documents yet.</p>
              <Link
                href="/dashboard/student/documents"
                className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
              >
                Upload a document to get started
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {docs.map((doc) => (
                <DocumentFlashcardPanel key={doc.id} doc={doc} />
              ))}
            </div>
          )}

          <div className="mt-6 text-center">
            <Link href="/dashboard/student" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
