'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { useTeacherQuizzes } from '@/hooks/use-quiz';
import { useClassContext } from '@/contexts/class-context';
import Link from 'next/link';

export default function TeacherQuizzesPage() {
  const { selectedClassId, selectedClass } = useClassContext();
  const { data, isLoading, isError } = useTeacherQuizzes(selectedClassId ?? undefined);

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
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-2xl font-bold text-gray-100">{data?.total ?? '—'}</p>
              <p className="text-xs text-gray-400 mt-1">Total Quizzes</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-2xl font-bold text-gray-100">{isLoading ? '—' : activeCount}</p>
              <p className="text-xs text-gray-400 mt-1">Published</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-2xl font-bold text-gray-100">{isLoading ? '—' : totalAttempts}</p>
              <p className="text-xs text-gray-400 mt-1">Total Attempts</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-2xl font-bold text-gray-100">
                {isLoading ? '—' : overallAvg !== null ? `${overallAvg}%` : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Avg. Score</p>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : isError ? (
            <div className="text-center py-16 text-red-400">Failed to load quizzes.</div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 mb-3">No quizzes yet.</p>
              <p className="text-sm text-gray-600">
                Go to a class and create a quiz from one of its documents.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-gray-100 truncate">{quiz.title}</h3>
                        <span
                          className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded border ${
                            quiz.status === 'published'
                              ? 'bg-green-900/40 text-green-300 border-green-800'
                              : quiz.status === 'archived'
                              ? 'bg-gray-800 text-gray-500 border-gray-700'
                              : 'bg-yellow-900/40 text-yellow-300 border-yellow-800'
                          }`}
                        >
                          {quiz.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        {quiz.class_name ?? 'No class'}
                        {quiz.difficulty && (
                          <span className="ml-2 text-gray-600">· {quiz.difficulty}</span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-100">{quiz.question_count}</p>
                        <p className="text-xs text-gray-500">Questions</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-100">{quiz.attempt_count}</p>
                        <p className="text-xs text-gray-500">Attempts</p>
                      </div>
                      <div className="text-center">
                        <p
                          className={`text-lg font-bold ${
                            quiz.avg_score !== null && quiz.avg_score >= 75
                              ? 'text-green-400'
                              : quiz.avg_score !== null && quiz.avg_score >= 50
                              ? 'text-yellow-400'
                              : 'text-gray-400'
                          }`}
                        >
                          {quiz.avg_score !== null ? `${quiz.avg_score}%` : '—'}
                        </p>
                        <p className="text-xs text-gray-500">Avg Score</p>
                      </div>
                      <Link
                        href={`/dashboard/teacher/quizzes/${quiz.id}/attempts`}
                        className="shrink-0 px-3 py-1.5 text-xs font-medium text-primary-300 border border-primary-800 rounded-lg hover:bg-primary-900/40 transition-colors"
                      >
                        View Attempts
                      </Link>
                    </div>
                  </div>

                  {quiz.avg_score !== null && quiz.avg_score > 0 && (
                    <div className="mt-4">
                      <div className="h-1.5 bg-gray-800 rounded-full">
                        <div
                          className={`h-1.5 rounded-full ${
                            quiz.avg_score >= 75
                              ? 'bg-green-500'
                              : quiz.avg_score >= 50
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${quiz.avg_score}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
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
    </ProtectedRoute>
  );
}
