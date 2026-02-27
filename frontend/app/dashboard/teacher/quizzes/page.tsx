'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import Link from 'next/link';

const mockQuizzes = [
  { id: '1', title: 'Algebra Fundamentals Quiz', class: 'Mathematics 101', questions: 10, attempts: 24, avgScore: 78, createdAt: '2026-02-22', status: 'active' },
  { id: '2', title: 'Newton\'s Laws Assessment', class: 'Physics Advanced', questions: 15, attempts: 18, avgScore: 65, createdAt: '2026-02-18', status: 'active' },
  { id: '3', title: 'Literary Devices Test', class: 'English Literature', questions: 12, attempts: 0, avgScore: 0, createdAt: '2026-02-25', status: 'draft' },
  { id: '4', title: 'Cell Biology Quiz', class: 'Biology Basic', questions: 8, attempts: 30, avgScore: 82, createdAt: '2026-02-10', status: 'active' },
];

export default function TeacherQuizzesPage() {
  return (
    <ProtectedRoute allowedRoles={['TEACHER']}>
      <div className="bg-[#0a0a0f] min-h-full">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Quizzes</h1>
              <p className="text-gray-400 mt-1">Create and manage quizzes for your classes.</p>
            </div>
            <button
              disabled
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg opacity-60 cursor-not-allowed"
              title="Coming soon"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create Quiz
            </button>
          </div>

          {/* Coming soon banner */}
          <div className="mb-6 px-4 py-3 bg-yellow-950/50 border border-yellow-800/50 text-yellow-300 rounded-xl text-sm flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            AI-powered quiz generation is under development. The data below is for preview only.
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Quizzes', value: '4', icon: '📝' },
              { label: 'Active', value: '3', icon: '✅' },
              { label: 'Total Attempts', value: '72', icon: '👥' },
              { label: 'Avg. Score', value: '75%', icon: '🎯' },
            ].map((s) => (
              <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{s.icon}</span>
                  <div>
                    <p className="text-2xl font-bold text-gray-100">{s.value}</p>
                    <p className="text-xs text-gray-400">{s.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quizzes list */}
          <div className="space-y-4">
            {mockQuizzes.map((quiz) => (
              <div key={quiz.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-gray-100 truncate">{quiz.title}</h3>
                      <span className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded border ${
                        quiz.status === 'active'
                          ? 'bg-green-900/40 text-green-300 border-green-800'
                          : 'bg-gray-800 text-gray-400 border-gray-700'
                      }`}>
                        {quiz.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{quiz.class}</p>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-100">{quiz.questions}</p>
                      <p className="text-xs text-gray-500">Questions</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-100">{quiz.attempts}</p>
                      <p className="text-xs text-gray-500">Attempts</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-lg font-bold ${quiz.avgScore >= 75 ? 'text-green-400' : quiz.avgScore >= 50 ? 'text-yellow-400' : 'text-gray-400'}`}>
                        {quiz.attempts > 0 ? `${quiz.avgScore}%` : '—'}
                      </p>
                      <p className="text-xs text-gray-500">Avg Score</p>
                    </div>
                  </div>
                </div>

                {quiz.avgScore > 0 && (
                  <div className="mt-4">
                    <div className="h-1.5 bg-gray-800 rounded-full">
                      <div
                        className={`h-1.5 rounded-full ${quiz.avgScore >= 75 ? 'bg-green-500' : quiz.avgScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${quiz.avgScore}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

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
