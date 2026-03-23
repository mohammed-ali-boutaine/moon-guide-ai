'use client';

import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { LoadingSpinner } from '@/components/ui';
import { useStudentAssignedQuizzes } from '@/hooks/use-quiz';
import type { StudentAssignedQuizItem } from '@/types/quiz';

function statusBadge(item: StudentAssignedQuizItem) {
  if (item.attempt_status === 'submitted') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/40 text-green-400 border border-green-700/50">
        Completed {item.score !== null ? `— ${Math.round(item.score)}%` : ''}
      </span>
    );
  }
  if (item.attempt_status === 'started' || item.attempt_status === 'in_progress') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900/40 text-yellow-400 border border-yellow-700/50">
        In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/40 text-blue-400 border border-blue-700/50">
      Not Started
    </span>
  );
}

function actionButton(item: StudentAssignedQuizItem) {
  if (item.attempt_status === 'submitted') {
    if (item.attempt_id) {
      return (
        <Link
          href={`/dashboard/student/quiz-results/${item.attempt_id}`}
          className="text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors"
        >
          View Results
        </Link>
      );
    }
    return null;
  }
  if (item.attempt_status === 'started' || item.attempt_status === 'in_progress') {
    return (
      <Link
        href={`/dashboard/student/quizzes/${item.quiz.id}/attempt`}
        className="text-sm font-medium text-yellow-400 hover:text-yellow-300 transition-colors"
      >
        Continue
      </Link>
    );
  }
  return (
    <Link
      href={`/dashboard/student/quizzes/${item.quiz.id}`}
      className="text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors"
    >
      Start Quiz
    </Link>
  );
}

function difficultyBadge(difficulty: string | null) {
  if (!difficulty) return null;
  const colors: Record<string, string> = {
    easy: 'text-green-400',
    medium: 'text-yellow-400',
    hard: 'text-red-400',
  };
  return (
    <span className={`text-xs capitalize ${colors[difficulty] ?? 'text-gray-400'}`}>
      {difficulty}
    </span>
  );
}

export default function StudentQuizzesPage() {
  const { data: quizzes, isLoading, error } = useStudentAssignedQuizzes();

  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <div className="min-h-screen bg-[#0a0a0f]">
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Link href="/dashboard/student" className="hover:text-gray-300 transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-gray-400">My Quizzes</span>
            </div>
            <h1 className="text-2xl font-bold text-white">My Quizzes</h1>
            <p className="text-gray-400 mt-1">Quizzes assigned to your classes</p>
          </div>

          {/* Content */}
          {isLoading && (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 text-red-400 text-sm">
              Failed to load quizzes. Please try again.
            </div>
          )}

          {!isLoading && !error && quizzes && quizzes.length === 0 && (
            <div className="text-center py-16">
              <div className="text-gray-600 text-4xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-300 mb-2">No quizzes yet</h3>
              <p className="text-gray-500 text-sm">
                Your teacher hasn't assigned any quizzes yet. Check back later.
              </p>
            </div>
          )}

          {!isLoading && !error && quizzes && quizzes.length > 0 && (
            <div className="space-y-3">
              {quizzes.map((item) => (
                <div
                  key={item.assignment_id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:border-gray-700 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-100 truncate">{item.quiz.title}</h3>
                      {difficultyBadge(item.quiz.difficulty)}
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      {item.class_name}
                      {item.due_date && (
                        <> &middot; Due {new Date(item.due_date).toLocaleDateString()}</>
                      )}
                      {item.quiz.duration_minutes && (
                        <> &middot; {item.quiz.duration_minutes} min</>
                      )}
                      {item.quiz.questions.length > 0 && (
                        <> &middot; {item.quiz.questions.length} questions</>
                      )}
                    </p>
                    {statusBadge(item)}
                  </div>
                  <div className="flex-shrink-0">
                    {actionButton(item)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
