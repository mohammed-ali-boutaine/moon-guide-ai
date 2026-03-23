'use client';

import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ProtectedRoute } from '@/components/auth/protected-route';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const FETCH_OPTS: RequestInit = { credentials: 'include' };

// ── Types ──────────────────────────────────────────────────────────────────────

interface QuizHistoryItem {
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

interface PaginatedQuizHistory {
  items: QuizHistoryItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── API ────────────────────────────────────────────────────────────────────────

async function fetchStudentInfo(studentId: string) {
  // Use recent-joins and filter, or class detail — no dedicated profile endpoint.
  // Fall back to grabbing the student from the quiz history items themselves.
  const res = await fetch(
    `${API_URL}/api/classes/recent-joins?limit=200`,
    FETCH_OPTS,
  );
  if (!res.ok) throw new Error('Failed to fetch student info');
  const data: Array<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    joined_at: string;
    class_id: string;
    class_name: string;
  }> = await res.json();
  return data.find((s) => s.id === studentId) ?? null;
}

async function fetchStudentQuizHistory(
  studentId: string,
  page: number,
  pageSize: number,
): Promise<PaginatedQuizHistory> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    sort_order: 'desc',
  });
  const res = await fetch(
    `${API_URL}/api/students/${studentId}/quiz-history?${params}`,
    FETCH_OPTS,
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || 'Failed to fetch quiz history');
  }
  return res.json();
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(firstName: string, lastName: string, email: string) {
  if (firstName || lastName) {
    return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
  }
  return email?.[0]?.toUpperCase() ?? '?';
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function DifficultyBadge({ difficulty }: { difficulty: string | null }) {
  if (!difficulty) return null;
  const styles: Record<string, string> = {
    easy: 'bg-green-900/40 text-green-300 border-green-800',
    medium: 'bg-yellow-900/40 text-yellow-300 border-yellow-800',
    hard: 'bg-red-900/40 text-red-300 border-red-800',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded border ${styles[difficulty] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
      {difficulty}
    </span>
  );
}

function ScoreCell({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-500">—</span>;
  const color = score >= 75 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400';
  return <span className={`font-semibold ${color}`}>{score}%</span>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: studentId } = use(params);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const { data: studentInfo } = useQuery({
    queryKey: ['student-info', studentId],
    queryFn: () => fetchStudentInfo(studentId),
    staleTime: 60_000,
  });

  const { data: history, isLoading, isError } = useQuery({
    queryKey: ['student-quiz-history', studentId, page],
    queryFn: () => fetchStudentQuizHistory(studentId, page, PAGE_SIZE),
    staleTime: 30_000,
  });

  const name = studentInfo
    ? `${studentInfo.first_name || ''} ${studentInfo.last_name || ''}`.trim() || studentInfo.email
    : studentId;
  const initials = studentInfo
    ? getInitials(studentInfo.first_name, studentInfo.last_name, studentInfo.email)
    : '?';

  const items = history?.items ?? [];
  const scoredItems = items.filter((i) => i.score !== null);
  const avgScore =
    scoredItems.length > 0
      ? Math.round(scoredItems.reduce((acc, i) => acc + (i.score ?? 0), 0) / scoredItems.length)
      : null;

  return (
    <ProtectedRoute allowedRoles={['TEACHER']}>
      <div className="bg-[#0a0a0f] min-h-full">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Back */}
          <div className="mb-6">
            <Link
              href="/dashboard/teacher/students"
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              ← Back to Students
            </Link>
          </div>

          {/* Student header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-xl shrink-0">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-100">{name}</h1>
              {studentInfo && (
                <p className="text-gray-400 text-sm mt-0.5">
                  {studentInfo.email} · Joined {formatDate(studentInfo.joined_at)}
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-2xl font-bold text-gray-100">{history?.total ?? '—'}</p>
              <p className="text-xs text-gray-400 mt-1">Quizzes Completed</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className={`text-2xl font-bold ${
                avgScore !== null && avgScore >= 75 ? 'text-green-400'
                  : avgScore !== null && avgScore >= 50 ? 'text-yellow-400'
                  : 'text-gray-100'
              }`}>
                {avgScore !== null ? `${avgScore}%` : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Avg. Score</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-2xl font-bold text-gray-100">
                {scoredItems.filter((i) => (i.score ?? 0) >= 50).length}
              </p>
              <p className="text-xs text-gray-400 mt-1">Passed</p>
            </div>
          </div>

          {/* Quiz history table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="text-base font-semibold text-gray-100">Quiz History</h2>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              </div>
            ) : isError ? (
              <div className="text-center py-16 text-red-400">Failed to load quiz history.</div>
            ) : items.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500">No completed quizzes yet.</p>
              </div>
            ) : (
              <>
                {/* Table header */}
                <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-3 border-b border-gray-800 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span>Quiz</span>
                  <span>Class</span>
                  <span>Difficulty</span>
                  <span>Score</span>
                  <span>Submitted</span>
                </div>

                <div className="divide-y divide-gray-800">
                  {items.map((item) => (
                    <div
                      key={item.attempt_id}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto_auto] gap-2 sm:gap-4 px-6 py-4 hover:bg-gray-800/30 transition-colors items-center"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-100 truncate">{item.quiz_title}</p>
                        {item.class_name && (
                          <p className="text-xs text-gray-500 sm:hidden">{item.class_name}</p>
                        )}
                      </div>
                      <span className="hidden sm:block text-xs text-gray-400 text-right">
                        {item.class_name ?? '—'}
                      </span>
                      <div className="hidden sm:flex justify-end">
                        <DifficultyBadge difficulty={item.quiz_difficulty} />
                      </div>
                      <div className="hidden sm:flex justify-end text-sm">
                        <ScoreCell score={item.score} />
                      </div>
                      <span className="hidden sm:block text-xs text-gray-500 text-right whitespace-nowrap">
                        {formatDate(item.submitted_at)}
                      </span>

                      {/* Mobile row — score + date */}
                      <div className="flex items-center justify-between sm:hidden">
                        <div className="flex items-center gap-2">
                          <DifficultyBadge difficulty={item.quiz_difficulty} />
                          <ScoreCell score={item.score} />
                        </div>
                        <span className="text-xs text-gray-500">{formatDate(item.submitted_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {history && history.total_pages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-gray-500">
                      Page {page} of {history.total_pages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(history.total_pages, p + 1))}
                      disabled={page === history.total_pages}
                      className="px-3 py-1.5 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
