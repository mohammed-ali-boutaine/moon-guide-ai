'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useStudyCards, useReviewFlashcard } from '@/hooks/use-flashcards';
import type { FlashcardRating, FlashcardWithProgress } from '@/types/flashcard';

// ── Flip card ─────────────────────────────────────────────────────────────────

function FlipCard({ card, flipped, onFlip }: { card: FlashcardWithProgress; flipped: boolean; onFlip: () => void }) {
  return (
    <div
      className="relative w-full cursor-pointer"
      style={{ perspective: '1200px', minHeight: '240px' }}
      onClick={onFlip}
    >
      <div
        className="relative w-full h-full transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          minHeight: '240px',
        }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-gray-900 border border-gray-700 rounded-2xl text-center"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <p className="text-xs uppercase tracking-widest text-gray-600 mb-4 font-medium">Question</p>
          <p className="text-xl font-medium text-gray-100 leading-relaxed">{card.front}</p>
          <p className="text-xs text-gray-600 mt-6">Click to reveal answer</p>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-gray-800 border border-primary-700/40 rounded-2xl text-center"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <p className="text-xs uppercase tracking-widest text-primary-500 mb-4 font-medium">Answer</p>
          <p className="text-lg text-gray-100 leading-relaxed">{card.back}</p>
        </div>
      </div>
    </div>
  );
}

// ── Rating buttons ─────────────────────────────────────────────────────────────

const RATINGS: { label: string; value: FlashcardRating; color: string }[] = [
  { label: 'Again', value: 0, color: 'border-red-700 text-red-400 hover:bg-red-900/40' },
  { label: 'Hard',  value: 1, color: 'border-orange-700 text-orange-400 hover:bg-orange-900/40' },
  { label: 'Good',  value: 2, color: 'border-blue-700 text-blue-400 hover:bg-blue-900/40' },
  { label: 'Easy',  value: 3, color: 'border-green-700 text-green-400 hover:bg-green-900/40' },
];

// ── Study session ──────────────────────────────────────────────────────────────

function StudySession({ documentId }: { documentId: number }) {
  const { data: cards, isLoading, isError } = useStudyCards(documentId, 20);
  const review = useReviewFlashcard();

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  async function handleRate(rating: FlashcardRating) {
    if (!cards) return;
    const card = cards[index];
    try {
      await review.mutateAsync({ flashcardId: card.id, rating });
    } catch {
      // non-blocking
    }
    setReviewed((r) => r + 1);
    if (index + 1 >= cards.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
      setFlipped(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (isError || !cards) {
    return <p className="text-center text-red-400 py-16">Failed to load study session.</p>;
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-lg mb-2">Nothing due for review.</p>
        <p className="text-gray-600 text-sm mb-6">All caught up! Come back later.</p>
        <Link
          href="/dashboard/student/flashcards"
          className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
        >
          ← Back to flashcards
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-green-900/40 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-xl font-semibold text-gray-100 mb-1">Session complete!</p>
        <p className="text-gray-400 mb-6">Reviewed {reviewed} card{reviewed !== 1 ? 's' : ''}.</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => { setIndex(0); setFlipped(false); setDone(false); setReviewed(0); }}
            className="px-4 py-2 text-sm font-medium text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Study again
          </button>
          <Link
            href="/dashboard/student/flashcards"
            className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            Done
          </Link>
        </div>
      </div>
    );
  }

  const card = cards[index];
  const progress = ((index) / cards.length) * 100;

  return (
    <div className="max-w-xl mx-auto">
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-1.5 bg-primary-600 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 shrink-0">
          {index + 1} / {cards.length}
        </span>
      </div>

      {/* Card */}
      <FlipCard card={card} flipped={flipped} onFlip={() => setFlipped((v) => !v)} />

      {/* Rating buttons — only shown after flip */}
      <div className="mt-6">
        {flipped ? (
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map((r) => (
              <button
                key={r.value}
                onClick={() => handleRate(r.value)}
                disabled={review.isPending}
                className={`py-2.5 text-sm font-medium border rounded-lg transition-colors disabled:opacity-50 ${r.color}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => setFlipped(true)}
            className="w-full py-2.5 text-sm font-medium text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Show answer
          </button>
        )}
      </div>

      {/* Repetition hint */}
      {card.repetitions > 0 && (
        <p className="text-center text-xs text-gray-600 mt-4">
          Reviewed {card.repetitions}×  · interval {card.interval_days}d
        </p>
      )}
    </div>
  );
}

// ── Page wrapper (needs Suspense for useSearchParams) ─────────────────────────

function StudyPageInner() {
  const params = useSearchParams();
  const documentId = params.get('document_id');

  if (!documentId || isNaN(Number(documentId))) {
    return (
      <div className="text-center py-16 text-red-400">
        Missing document_id parameter.
      </div>
    );
  }

  return <StudySession documentId={Number(documentId)} />;
}

export default function FlashcardStudyPage() {
  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <div className="bg-[#0a0a0f] min-h-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Link
              href="/dashboard/student/flashcards"
              className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-100">Study</h1>
          </div>

          <Suspense fallback={
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          }>
            <StudyPageInner />
          </Suspense>
        </div>
      </div>
    </ProtectedRoute>
  );
}
