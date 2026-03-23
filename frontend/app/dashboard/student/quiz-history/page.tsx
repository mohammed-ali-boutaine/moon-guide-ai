'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/protected-route';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useQuizHistory } from '@/hooks/use-quiz';
import { useStudentClasses } from '@/hooks/use-classes';
import type { QuizHistoryItem } from '@/types/quiz';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
        En cours
      </span>
    );
  }
  const color =
    score >= 80
      ? 'bg-green-900/50 text-green-300 border-green-800'
      : score >= 60
      ? 'bg-amber-900/50 text-amber-300 border-amber-800'
      : 'bg-red-900/50 text-red-300 border-red-800';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      {score.toFixed(1)}%
    </span>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string | null }) {
  if (!difficulty) return <span className="text-gray-600">—</span>;
  const map: Record<string, string> = {
    easy: 'text-green-400',
    medium: 'text-amber-400',
    hard: 'text-red-400',
  };
  return (
    <span className={`text-xs font-medium capitalize ${map[difficulty] ?? 'text-gray-400'}`}>
      {difficulty}
    </span>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

function HistoryTable({ items }: { items: QuizHistoryItem[] }) {
  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="w-14 h-14 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-gray-400 text-sm">Aucun quiz complété pour l'instant.</p>
        <p className="text-gray-600 text-xs mt-1">Passez un quiz pour voir vos résultats ici.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Quiz
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
              Classe
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
              Difficulté
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Score
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
              Soumis le
            </th>
            <th className="py-3 px-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/60">
          {items.map((item) => (
            <tr
              key={item.attempt_id}
              className="hover:bg-gray-800/30 transition-colors group"
            >
              {/* Quiz title */}
              <td className="py-3.5 px-4">
                <span className="font-medium text-gray-100 group-hover:text-white transition-colors line-clamp-1">
                  {item.quiz_title}
                </span>
              </td>

              {/* Class */}
              <td className="py-3.5 px-4 hidden md:table-cell">
                {item.class_name ? (
                  <span className="text-gray-300">{item.class_name}</span>
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </td>

              {/* Difficulty */}
              <td className="py-3.5 px-4 hidden sm:table-cell">
                <DifficultyBadge difficulty={item.quiz_difficulty} />
              </td>

              {/* Score */}
              <td className="py-3.5 px-4">
                <ScoreBadge score={item.score} />
              </td>

              {/* Date */}
              <td className="py-3.5 px-4 hidden lg:table-cell text-gray-400 tabular-nums text-xs">
                {formatDate(item.submitted_at)}
              </td>

              {/* Action */}
              <td className="py-3.5 px-4 text-right">
                <div className="flex items-center justify-end gap-3">
                  {item.status === 'submitted' && (
                    <Link
                      href={`/dashboard/student/quiz-results/${item.attempt_id}`}
                      className="text-xs font-medium text-green-400 hover:text-green-300 transition-colors"
                    >
                      Résultats →
                    </Link>
                  )}
                  <Link
                    href={`/dashboard/student/quizzes/${item.quiz_id}`}
                    className="text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    Quiz →
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  // Show at most 7 page numbers with ellipsis logic
  const visible = pages.filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2,
  );

  return (
    <div className="flex items-center justify-center gap-1.5 pt-2">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 text-xs
          hover:border-gray-600 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        ← Préc.
      </button>

      {visible.map((p, idx) => {
        const prev = visible[idx - 1];
        const gap = prev !== undefined && p - prev > 1;
        return (
          <span key={p} className="flex items-center gap-1.5">
            {gap && <span className="text-gray-600 text-xs px-1">…</span>}
            <button
              onClick={() => onPage(p)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-all border
                ${p === page
                  ? 'bg-primary-600 text-white border-primary-500'
                  : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200'}`}
            >
              {p}
            </button>
          </span>
        );
      })}

      <button
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 text-xs
          hover:border-gray-600 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        Suiv. →
      </button>
    </div>
  );
}

// ── Stats row ─────────────────────────────────────────────────────────────────

function StatsRow({ items }: { items: QuizHistoryItem[] }) {
  const withScore = items.filter((i) => i.score !== null);
  const avg =
    withScore.length > 0
      ? withScore.reduce((s, i) => s + i.score!, 0) / withScore.length
      : null;
  const best = withScore.length > 0 ? Math.max(...withScore.map((i) => i.score!)) : null;

  const stats = [
    { label: 'Quiz complétés', value: items.length.toString() },
    { label: 'Moyenne', value: avg !== null ? `${avg.toFixed(1)}%` : '—' },
    { label: 'Meilleur score', value: best !== null ? `${best.toFixed(1)}%` : '—' },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-gray-100">{s.value}</div>
          <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main content ──────────────────────────────────────────────────────────────

function QuizHistoryContent() {
  const [page, setPage] = useState(1);
  const [classFilter, setClassFilter] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading, error } = useQuizHistory(
    page,
    20,
    classFilter || null,
    sortOrder,
  );

  // Load enrolled classes for filter dropdown
  const { data: classesData } = useStudentClasses(1, 100);

  const handleClassChange = (val: string) => {
    setClassFilter(val);
    setPage(1);
  };

  const handleSortToggle = () => {
    setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'));
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Historique des quiz</h1>
            <p className="text-gray-400 text-sm mt-1">
              Tous vos quiz soumis avec scores et dates
            </p>
          </div>
          <Link
            href="/dashboard/student/quizzes"
            className="flex items-center gap-1.5 text-sm text-primary-400 hover:text-primary-300 transition-colors"
          >
            Mes quiz assignés →
          </Link>
        </div>

        {/* ── Stats (computed from current page) ─────────────────────────── */}
        {data && data.items.length > 0 && (
          <StatsRow items={data.items} />
        )}

        {/* ── Filters ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Class filter */}
          <select
            value={classFilter}
            onChange={(e) => handleClassChange(e.target.value)}
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-gray-200
              focus:outline-none focus:border-primary-600 transition-colors min-w-[180px]"
          >
            <option value="">Toutes les classes</option>
            {classesData?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Sort toggle */}
          <button
            onClick={handleSortToggle}
            className="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl
              text-sm text-gray-300 hover:border-gray-600 hover:text-gray-100 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            {sortOrder === 'desc' ? 'Plus récent d\'abord' : 'Plus ancien d\'abord'}
          </button>

          {/* Active filter badge */}
          {classFilter && (
            <button
              onClick={() => handleClassChange('')}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary-900/30 border border-primary-800
                rounded-xl text-xs text-primary-300 hover:bg-primary-900/50 transition-colors"
            >
              {classesData?.items.find((c) => c.id === classFilter)?.name ?? 'Classe'}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {data && (
            <span className="ml-auto text-xs text-gray-500 tabular-nums">
              {data.total} résultat{data.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* ── Table card ──────────────────────────────────────────────────── */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <p className="text-red-400 text-sm">Erreur lors du chargement de l'historique.</p>
              <p className="text-gray-600 text-xs mt-1">{String(error)}</p>
            </div>
          ) : (
            <HistoryTable items={data?.items ?? []} />
          )}
        </div>

        {/* ── Pagination ──────────────────────────────────────────────────── */}
        {data && data.total_pages > 1 && (
          <Pagination page={page} totalPages={data.total_pages} onPage={setPage} />
        )}
      </div>
    </div>
  );
}

// ── Page export ───────────────────────────────────────────────────────────────

export default function QuizHistoryPage() {
  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <QuizHistoryContent />
    </ProtectedRoute>
  );
}
