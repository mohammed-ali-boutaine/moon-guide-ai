'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useTeacherQuizzes, useUpdateQuiz, useAssignQuiz } from '@/hooks/use-quiz';
import { useClassContext } from '@/contexts/class-context';
import type { TeacherQuizListItem, QuizStatus } from '@/types/quiz';
import Link from 'next/link';

// ── Assign Quiz Modal ─────────────────────────────────────────────────────────

function AssignModal({
  quiz,
  classes,
  onClose,
}: {
  quiz: TeacherQuizListItem;
  classes: Array<{ id: string; name: string }>;
  onClose: () => void;
}) {
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const [dueDate, setDueDate] = useState('');
  const [done, setDone] = useState(false);
  const assign = useAssignQuiz();

  async function handleAssign() {
    if (!classId) return;
    try {
      await assign.mutateAsync({ quizId: quiz.id, classId, dueDate: dueDate || undefined });
      setDone(true);
    } catch {
      // error displayed via assign.isError below
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-gray-100">Assign Quiz to Class</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {done ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-green-900/40 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-200 font-medium mb-1">Quiz assigned!</p>
            <p className="text-sm text-gray-400 mb-4">Students in the class will be notified.</p>
            <button onClick={onClose} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors">Done</button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-4">
              Assign <span className="text-gray-200 font-medium">{quiz.title}</span> to a class.
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Class</label>
                {classes.length === 0 ? (
                  <p className="text-sm text-gray-500">No classes available.</p>
                ) : (
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Due date (optional)</label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                />
              </div>
            </div>
            {assign.isError && (
              <p className="text-sm text-red-400 mb-3">
                {assign.error instanceof Error ? assign.error.message : 'Failed to assign quiz'}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">Cancel</button>
              <button
                onClick={handleAssign}
                disabled={!classId || classes.length === 0 || assign.isPending}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {assign.isPending ? 'Assigning…' : 'Assign'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: QuizStatus }) {
  const styles: Record<QuizStatus, string> = {
    published: 'bg-green-900/40 text-green-300 border-green-800',
    archived: 'bg-gray-800 text-gray-500 border-gray-700',
    draft: 'bg-yellow-900/40 text-yellow-300 border-yellow-800',
  };
  return (
    <span className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded border ${styles[status]}`}>
      {status}
    </span>
  );
}

// ── Quiz row ──────────────────────────────────────────────────────────────────

function QuizRow({
  quiz,
  classes,
  onAssign,
}: {
  quiz: TeacherQuizListItem;
  classes: Array<{ id: string; name: string }>;
  onAssign: (quiz: TeacherQuizListItem) => void;
}) {
  const updateQuiz = useUpdateQuiz(quiz.id);

  async function toggleStatus() {
    const next: QuizStatus =
      quiz.status === 'published' ? 'archived' : quiz.status === 'archived' ? 'draft' : 'published';
    await updateQuiz.mutateAsync({ status: next });
  }

  const nextLabel =
    quiz.status === 'published' ? 'Archive' : quiz.status === 'archived' ? 'Restore' : 'Publish';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-base font-semibold text-gray-100 truncate">{quiz.title}</h3>
            <StatusBadge status={quiz.status} />
          </div>
          <p className="text-sm text-gray-400">
            {quiz.class_name ?? 'No class'}
            {quiz.difficulty && <span className="ml-2 text-gray-600">· {quiz.difficulty}</span>}
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap shrink-0">
          {/* Stats */}
          <div className="text-center">
            <p className="text-lg font-bold text-gray-100">{quiz.question_count}</p>
            <p className="text-xs text-gray-500">Questions</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-100">{quiz.attempt_count}</p>
            <p className="text-xs text-gray-500">Attempts</p>
          </div>
          <div className="text-center">
            <p className={`text-lg font-bold ${
              quiz.avg_score !== null && quiz.avg_score >= 75 ? 'text-green-400'
                : quiz.avg_score !== null && quiz.avg_score >= 50 ? 'text-yellow-400'
                : 'text-gray-400'
            }`}>
              {quiz.avg_score !== null ? `${quiz.avg_score}%` : '—'}
            </p>
            <p className="text-xs text-gray-500">Avg Score</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAssign(quiz)}
              className="px-3 py-1.5 text-xs font-medium text-green-300 border border-green-800 rounded-lg hover:bg-green-900/40 transition-colors"
            >
              Assign
            </button>
            <button
              onClick={toggleStatus}
              disabled={updateQuiz.isPending}
              className="px-3 py-1.5 text-xs font-medium text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {updateQuiz.isPending ? '…' : nextLabel}
            </button>
            <Link
              href={`/dashboard/teacher/quizzes/${quiz.id}/attempts`}
              className="px-3 py-1.5 text-xs font-medium text-primary-300 border border-primary-800 rounded-lg hover:bg-primary-900/40 transition-colors"
            >
              Attempts
            </Link>
          </div>
        </div>
      </div>

      {/* Score bar */}
      {quiz.avg_score !== null && quiz.avg_score > 0 && (
        <div className="mt-4">
          <div className="h-1.5 bg-gray-800 rounded-full">
            <div
              className={`h-1.5 rounded-full ${
                quiz.avg_score >= 75 ? 'bg-green-500' : quiz.avg_score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${quiz.avg_score}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TeacherQuizzesPage() {
  const { selectedClassId, selectedClass, classes } = useClassContext();
  const { data, isLoading, isError } = useTeacherQuizzes(selectedClassId ?? undefined);
  const [assignTarget, setAssignTarget] = useState<TeacherQuizListItem | null>(null);

  const quizzes = data?.items ?? [];
  const totalAttempts = quizzes.reduce((acc, q) => acc + q.attempt_count, 0);
  const activeCount = quizzes.filter((q) => q.status === 'published').length;
  const scoredQuizzes = quizzes.filter((q) => q.avg_score !== null);
  const overallAvg =
    scoredQuizzes.length > 0
      ? Math.round(scoredQuizzes.reduce((acc, q) => acc + (q.avg_score ?? 0), 0) / scoredQuizzes.length)
      : null;

  return (
    <ProtectedRoute allowedRoles={['TEACHER']}>
      <div className="bg-[#0a0a0f] min-h-full">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Quizzes</h1>
              <p className="text-gray-400 mt-1">
                {selectedClass ? `Quizzes for ${selectedClass.name}` : 'All your quizzes across all classes.'}
              </p>
            </div>
            {selectedClassId && (
              <Link
                href={`/dashboard/teacher/classes/${selectedClassId}/quiz/create`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Create Quiz
              </Link>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Quizzes', value: data?.total ?? '—' },
              { label: 'Published', value: isLoading ? '—' : activeCount },
              { label: 'Total Attempts', value: isLoading ? '—' : totalAttempts },
              { label: 'Avg. Score', value: isLoading ? '—' : overallAvg !== null ? `${overallAvg}%` : '—' },
            ].map((s) => (
              <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <p className="text-2xl font-bold text-gray-100">{s.value}</p>
                <p className="text-xs text-gray-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Quiz list */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : isError ? (
            <div className="text-center py-16 text-red-400">Failed to load quizzes.</div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 mb-3">No quizzes yet.</p>
              <p className="text-sm text-gray-600">Select a class and create a quiz from one of its documents.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {quizzes.map((quiz) => (
                <QuizRow
                  key={quiz.id}
                  quiz={quiz}
                  classes={classes}
                  onAssign={setAssignTarget}
                />
              ))}
            </div>
          )}

          <div className="mt-6 text-center">
            <Link href="/dashboard/teacher" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {assignTarget && (
        <AssignModal
          quiz={assignTarget}
          classes={classes}
          onClose={() => setAssignTarget(null)}
        />
      )}
    </ProtectedRoute>
  );
}
