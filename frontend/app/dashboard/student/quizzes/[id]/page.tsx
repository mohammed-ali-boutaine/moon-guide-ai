'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { LoadingSpinner } from '@/components/ui';
import { useStudentAssignedQuizzes } from '@/hooks/use-quiz';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function QuizDetailContent() {
  const params = useParams();
  const router = useRouter();
  const quizId = Number(params.id);

  const { data: quizzes, isLoading } = useStudentAssignedQuizzes();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const item = quizzes?.find((q) => q.quiz.id === quizId) ?? null;

  const handleStartQuiz = async () => {
    if (!item) return;
    setStarting(true);
    setStartError(null);
    try {
      const res = await fetch(`${API_URL}/api/quiz/${quizId}/start`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // 409 = attempt already exists — navigate to attempt page anyway
        if (res.status === 409 && err.attempt_id) {
          router.push(`/dashboard/student/quizzes/${quizId}/attempt`);
          return;
        }
        throw new Error(err.detail || 'Failed to start quiz');
      }
      router.push(`/dashboard/student/quizzes/${quizId}/attempt`);
    } catch (e: any) {
      setStartError(e.message);
    } finally {
      setStarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#0a0a0f]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center max-w-sm">
          <h2 className="text-lg font-semibold text-gray-200 mb-2">Quiz Not Found</h2>
          <p className="text-gray-500 text-sm mb-4">
            This quiz is not assigned to any of your classes.
          </p>
          <Link
            href="/dashboard/student/quizzes"
            className="text-primary-400 hover:text-primary-300 text-sm font-medium"
          >
            Back to My Quizzes
          </Link>
        </div>
      </div>
    );
  }

  const { quiz, class_name, due_date, attempt_status, attempt_id, score } = item;
  const isSubmitted = attempt_status === 'submitted';
  const isInProgress = attempt_status === 'started' || attempt_status === 'in_progress';

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/dashboard/student" className="hover:text-gray-300 transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <Link href="/dashboard/student/quizzes" className="hover:text-gray-300 transition-colors">
            My Quizzes
          </Link>
          <span>/</span>
          <span className="text-gray-400 truncate">{quiz.title}</span>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-800">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-white">{quiz.title}</h1>
              {quiz.difficulty && (
                <span className={`text-xs capitalize px-2 py-0.5 rounded-full border ${
                  quiz.difficulty === 'easy'
                    ? 'bg-green-900/30 text-green-400 border-green-700/50'
                    : quiz.difficulty === 'medium'
                    ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700/50'
                    : 'bg-red-900/30 text-red-400 border-red-700/50'
                }`}>
                  {quiz.difficulty}
                </span>
              )}
            </div>
            {quiz.description && (
              <p className="text-gray-400 text-sm mt-1">{quiz.description}</p>
            )}
          </div>

          {/* Details */}
          <div className="px-6 py-5 grid grid-cols-2 gap-4 border-b border-gray-800">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Class</p>
              <p className="text-sm text-gray-200 font-medium">{class_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Questions</p>
              <p className="text-sm text-gray-200 font-medium">{quiz.questions.length}</p>
            </div>
            {quiz.duration_minutes && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Duration</p>
                <p className="text-sm text-gray-200 font-medium">{quiz.duration_minutes} minutes</p>
              </div>
            )}
            {quiz.max_attempts && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Max Attempts</p>
                <p className="text-sm text-gray-200 font-medium">{quiz.max_attempts}</p>
              </div>
            )}
            {due_date && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Due Date</p>
                <p className="text-sm text-gray-200 font-medium">
                  {new Date(due_date).toLocaleDateString(undefined, {
                    weekday: 'short', month: 'short', day: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Status + Action */}
          <div className="px-6 py-5">
            {isSubmitted ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-900/40 text-green-400 border border-green-700/50">
                    Completed
                  </span>
                  {score !== null && (
                    <span className="text-gray-300 font-semibold">{Math.round(score)}%</span>
                  )}
                </div>
                {attempt_id && (
                  <Link
                    href={`/dashboard/student/quiz-results/${attempt_id}`}
                    className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    View Results
                  </Link>
                )}
              </div>
            ) : isInProgress ? (
              <div className="space-y-3">
                <p className="text-yellow-400 text-sm font-medium">You have an attempt in progress.</p>
                <Link
                  href={`/dashboard/student/quizzes/${quizId}/attempt`}
                  className="inline-flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Continue Quiz
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-gray-400 text-sm">
                  You haven't started this quiz yet.
                </p>
                {startError && (
                  <p className="text-red-400 text-sm">{startError}</p>
                )}
                <button
                  onClick={handleStartQuiz}
                  disabled={starting}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {starting ? 'Starting...' : 'Start Quiz'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QuizDetailPage() {
  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <QuizDetailContent />
    </ProtectedRoute>
  );
}
