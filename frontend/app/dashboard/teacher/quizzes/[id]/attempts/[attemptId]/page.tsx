'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAttemptResults } from '@/hooks/use-quiz-results';

function formatScore(score: number | null): string {
  return score !== null ? `${score.toFixed(1)}%` : '—';
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remaining}s` : `${remaining}s`;
}

export default function TeacherAttemptDetailsPage() {
  const { id, attemptId } = useParams<{ id: string; attemptId: string }>();
  const quizId = Number.parseInt(id ?? '0', 10);
  const parsedAttemptId = Number.parseInt(attemptId ?? '0', 10);

  const { data, isLoading, isError, error } = useAttemptResults(parsedAttemptId);

  return (
    <ProtectedRoute allowedRoles={['TEACHER']}>
      <div className="bg-[#0a0a0f] min-h-full">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link
              href={`/dashboard/teacher/quizzes/${quizId}/attempts`}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              ← Back to Attempts
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : isError || !data ? (
            <div className="text-center py-16">
              <p className="text-red-400">{error?.message ?? 'Failed to load attempt details.'}</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-100">{data.quiz_title}</h1>
                <p className="text-gray-400 mt-1">Attempt #{data.attempt_id}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <p className="text-2xl font-bold text-gray-100">{formatScore(data.score)}</p>
                  <p className="text-xs text-gray-400 mt-1">Score</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <p className="text-2xl font-bold text-gray-100">{formatScore(data.class_average)}</p>
                  <p className="text-xs text-gray-400 mt-1">Class Avg.</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <p className="text-2xl font-bold text-gray-100">{data.total_questions}</p>
                  <p className="text-xs text-gray-400 mt-1">Questions</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <p className="text-2xl font-bold text-gray-100">{formatDuration(data.duration_seconds)}</p>
                  <p className="text-xs text-gray-400 mt-1">Duration</p>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left px-5 py-3 text-gray-400 font-medium">Question</th>
                      <th className="text-left px-5 py-3 text-gray-400 font-medium">Student Answer</th>
                      <th className="text-left px-5 py-3 text-gray-400 font-medium">Correct Answer</th>
                      <th className="text-left px-5 py-3 text-gray-400 font-medium">Status</th>
                      <th className="text-left px-5 py-3 text-gray-400 font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.questions.map((q, index) => {
                      const effectiveScore = q.teacher_score ?? q.score;

                      return (
                        <tr key={q.question_id} className="border-b border-gray-800/50 align-top">
                          <td className="px-5 py-3 text-gray-200">
                            <p className="font-medium">Q{index + 1}</p>
                            <p className="text-xs text-gray-400 mt-1">{q.question_text}</p>
                          </td>
                          <td className="px-5 py-3 text-gray-300">{q.student_answer ?? '—'}</td>
                          <td className="px-5 py-3 text-gray-400">{q.correct_answer ?? '—'}</td>
                          <td className="px-5 py-3">
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded border ${
                                q.needs_review
                                  ? 'bg-yellow-900/40 text-yellow-300 border-yellow-800'
                                  : q.is_correct === true
                                    ? 'bg-green-900/40 text-green-300 border-green-800'
                                    : q.is_correct === false
                                      ? 'bg-red-900/40 text-red-300 border-red-800'
                                      : 'bg-gray-800 text-gray-300 border-gray-700'
                              }`}
                            >
                              {q.needs_review
                                ? 'Needs review'
                                : q.is_correct === true
                                  ? 'Correct'
                                  : q.is_correct === false
                                    ? 'Incorrect'
                                    : 'Pending'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-200 font-semibold">
                            {effectiveScore !== null ? `${effectiveScore.toFixed(0)}/100` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
