'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { useQuizAttempts } from '@/hooks/use-quiz';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function QuizAttemptsPage() {
  const { id } = useParams<{ id: string }>();
  const quizId = id ? parseInt(id, 10) : null;
  const { data, isLoading, isError } = useQuizAttempts(quizId);

  const attempts = data?.items ?? [];
  const submittedAttempts = attempts.filter((a) => a.status === 'submitted' && a.score !== null);
  const avgScore =
    submittedAttempts.length > 0
      ? Math.round(submittedAttempts.reduce((acc, a) => acc + (a.score ?? 0), 0) / submittedAttempts.length)
      : null;

  return (
    <ProtectedRoute allowedRoles={['TEACHER']}>
      <div className="bg-[#0a0a0f] min-h-full">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link href="/dashboard/teacher/quizzes" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
              ← Back to Quizzes
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100">
              {data?.quiz_title ?? 'Quiz Attempts'}
            </h1>
            <p className="text-gray-400 mt-1">All student attempts for this quiz.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-2xl font-bold text-gray-100">{data?.total ?? '—'}</p>
              <p className="text-xs text-gray-400 mt-1">Total Attempts</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-2xl font-bold text-gray-100">{isLoading ? '—' : submittedAttempts.length}</p>
              <p className="text-xs text-gray-400 mt-1">Submitted</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-2xl font-bold text-gray-100">
                {isLoading ? '—' : avgScore !== null ? `${avgScore}%` : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Avg. Score</p>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : isError ? (
            <div className="text-center py-16 text-red-400">Failed to load attempts.</div>
          ) : attempts.length === 0 ? (
            <div className="text-center py-16 text-gray-500">No attempts yet.</div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-5 py-3 text-gray-400 font-medium">Student</th>
                    <th className="text-left px-5 py-3 text-gray-400 font-medium">Status</th>
                    <th className="text-left px-5 py-3 text-gray-400 font-medium">Score</th>
                    <th className="text-left px-5 py-3 text-gray-400 font-medium">Started</th>
                    <th className="text-left px-5 py-3 text-gray-400 font-medium">Submitted</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((attempt) => (
                    <tr key={attempt.attempt_id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-gray-100 font-medium">
                          {attempt.student_name ?? attempt.student_email}
                        </p>
                        {attempt.student_name && (
                          <p className="text-xs text-gray-500">{attempt.student_email}</p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded border ${
                          attempt.status === 'submitted'
                            ? 'bg-green-900/40 text-green-300 border-green-800'
                            : 'bg-yellow-900/40 text-yellow-300 border-yellow-800'
                        }`}>
                          {attempt.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`font-semibold ${
                          attempt.score !== null && attempt.score >= 75
                            ? 'text-green-400'
                            : attempt.score !== null && attempt.score >= 50
                            ? 'text-yellow-400'
                            : attempt.score !== null
                            ? 'text-red-400'
                            : 'text-gray-500'
                        }`}>
                          {attempt.score !== null ? `${attempt.score}%` : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400">
                        {new Date(attempt.started_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-gray-400">
                        {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/dashboard/teacher/quizzes/${quizId}/attempts/${attempt.attempt_id}`}
                          className="text-xs text-primary-400 hover:text-primary-300"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
