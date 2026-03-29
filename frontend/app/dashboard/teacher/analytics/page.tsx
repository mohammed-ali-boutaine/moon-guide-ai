'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useTeacherQuizzes } from '@/hooks/use-quiz';
import { useClassContext } from '@/contexts/class-context';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const FETCH_OPTS: RequestInit = { credentials: 'include' };

interface StrugglingStudent {
  student_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  class_id: string;
  class_name: string;
  avg_score: number;
  attempt_count: number;
}

async function fetchStrugglingStudents(threshold: number, classId?: string): Promise<{ items: StrugglingStudent[]; total: number; threshold: number }> {
  const params = new URLSearchParams({ threshold: String(threshold) });
  if (classId) params.set('class_id', classId);
  const res = await fetch(`${API_URL}/api/quiz/struggling-students?${params}`, FETCH_OPTS);
  if (!res.ok) throw new Error('Failed to fetch struggling students');
  return res.json();
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function ScoreBar({ value, color = 'bg-primary-500' }: { value: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="text-sm text-gray-300 w-10 text-right">{value}%</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TeacherAnalyticsPage() {
  const { classes } = useClassContext();
  const [threshold, setThreshold] = useState(50);
  const [alertClassId, setAlertClassId] = useState<string>('');

  // Fetch all quizzes across all classes
  const { data: quizData, isLoading } = useTeacherQuizzes(undefined);

  const { data: strugglingData, isLoading: strugglingLoading } = useQuery({
    queryKey: ['struggling-students', threshold, alertClassId || undefined],
    queryFn: () => fetchStrugglingStudents(threshold, alertClassId || undefined),
    staleTime: 30_000,
  });

  const quizzes = quizData?.items ?? [];

  // Global KPIs
  const totalStudents = classes.reduce((acc, c) => acc + (c.student_count ?? 0), 0);
  const totalAttempts = quizzes.reduce((acc, q) => acc + q.attempt_count, 0);
  const scoredQuizzes = quizzes.filter((q) => q.avg_score !== null);
  const overallAvg =
    scoredQuizzes.length > 0
      ? Math.round(scoredQuizzes.reduce((acc, q) => acc + (q.avg_score ?? 0), 0) / scoredQuizzes.length)
      : null;
  const publishedCount = quizzes.filter((q) => q.status === 'published').length;

  // Per-class aggregation
  const classStats = classes.map((cls) => {
    const classQuizzes = quizzes.filter((q) => q.class_id === cls.id);
    const classScored = classQuizzes.filter((q) => q.avg_score !== null);
    const classAvg =
      classScored.length > 0
        ? Math.round(classScored.reduce((acc, q) => acc + (q.avg_score ?? 0), 0) / classScored.length)
        : null;
    const classAttempts = classQuizzes.reduce((acc, q) => acc + q.attempt_count, 0);
    return {
      id: cls.id,
      name: cls.name,
      studentCount: cls.student_count ?? 0,
      quizCount: classQuizzes.length,
      attempts: classAttempts,
      avgScore: classAvg,
    };
  });

  // Top quizzes by avg score for bar chart (up to 8)
  const chartQuizzes = [...scoredQuizzes]
    .sort((a, b) => (b.avg_score ?? 0) - (a.avg_score ?? 0))
    .slice(0, 8);
  const maxScore = Math.max(...chartQuizzes.map((q) => q.avg_score ?? 0), 1);

  return (
    <ProtectedRoute allowedRoles={['TEACHER']}>
      <div className="bg-[#0a0a0f] min-h-full">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100">Analytics</h1>
            <p className="text-gray-400 mt-1">Track student performance and class engagement.</p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              {
                label: 'Total Students',
                value: isLoading ? '—' : totalStudents,
                sub: `across ${classes.length} class${classes.length !== 1 ? 'es' : ''}`,
              },
              {
                label: 'Avg. Score',
                value: isLoading ? '—' : overallAvg !== null ? `${overallAvg}%` : '—',
                sub: `from ${scoredQuizzes.length} scored quiz${scoredQuizzes.length !== 1 ? 'zes' : ''}`,
              },
              {
                label: 'Total Attempts',
                value: isLoading ? '—' : totalAttempts,
                sub: `across ${quizzes.length} quiz${quizzes.length !== 1 ? 'zes' : ''}`,
              },
              {
                label: 'Published Quizzes',
                value: isLoading ? '—' : publishedCount,
                sub: `of ${quizzes.length} total`,
              },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <p className="text-sm text-gray-400 mb-1">{kpi.label}</p>
                <p className="text-3xl font-bold text-gray-100">{kpi.value}</p>
                <p className="text-xs text-gray-500 mt-1">{kpi.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Quiz score chart */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-base font-semibold text-gray-100 mb-4">Quiz Avg. Scores</h2>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
                </div>
              ) : chartQuizzes.length === 0 ? (
                <p className="text-gray-500 text-sm py-8 text-center">No scored quizzes yet.</p>
              ) : (
                <div className="flex items-end gap-2 h-36">
                  {chartQuizzes.map((q) => {
                    const pct = ((q.avg_score ?? 0) / maxScore) * 100;
                    const color =
                      (q.avg_score ?? 0) >= 75
                        ? 'bg-green-500'
                        : (q.avg_score ?? 0) >= 50
                        ? 'bg-yellow-500'
                        : 'bg-red-500';
                    return (
                      <div key={q.id} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${q.title}: ${q.avg_score}%`}>
                        <span className="text-xs text-gray-400 font-medium">{q.avg_score}%</span>
                        <div
                          className={`w-full ${color} rounded-t-sm transition-all`}
                          style={{ height: `${pct}%`, minHeight: '4px' }}
                        />
                        <span className="text-xs text-gray-600 truncate w-full text-center">
                          Q{q.id}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Score distribution */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-base font-semibold text-gray-100 mb-4">Score Distribution</h2>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
                </div>
              ) : scoredQuizzes.length === 0 ? (
                <p className="text-gray-500 text-sm py-8 text-center">No data yet.</p>
              ) : (
                <div className="space-y-3">
                  {[
                    {
                      label: 'Excellent (≥ 90%)',
                      count: scoredQuizzes.filter((q) => (q.avg_score ?? 0) >= 90).length,
                      color: 'bg-green-500',
                    },
                    {
                      label: 'Good (75–89%)',
                      count: scoredQuizzes.filter((q) => (q.avg_score ?? 0) >= 75 && (q.avg_score ?? 0) < 90).length,
                      color: 'bg-green-600',
                    },
                    {
                      label: 'Average (50–74%)',
                      count: scoredQuizzes.filter((q) => (q.avg_score ?? 0) >= 50 && (q.avg_score ?? 0) < 75).length,
                      color: 'bg-yellow-500',
                    },
                    {
                      label: 'Below average (< 50%)',
                      count: scoredQuizzes.filter((q) => (q.avg_score ?? 0) < 50).length,
                      color: 'bg-red-500',
                    },
                  ].map((band) => (
                    <div key={band.label} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-36 shrink-0">{band.label}</span>
                      <div className="flex-1 h-2 bg-gray-800 rounded-full">
                        <div
                          className={`h-2 rounded-full ${band.color}`}
                          style={{ width: `${(band.count / scoredQuizzes.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-6 text-right">{band.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Class performance table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="text-base font-semibold text-gray-100">Class Performance</h2>
            </div>
            {isLoading || classes.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                {isLoading ? 'Loading…' : 'No classes yet.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Class</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Students</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Quizzes</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Attempts</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider min-w-36">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {classStats.map((cls) => (
                      <tr key={cls.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-100">
                          <Link
                            href={`/dashboard/teacher/classes/${cls.id}`}
                            className="hover:text-primary-400 transition-colors"
                          >
                            {cls.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">{cls.studentCount}</td>
                        <td className="px-6 py-4 text-sm text-gray-300">{cls.quizCount}</td>
                        <td className="px-6 py-4 text-sm text-gray-300">{cls.attempts}</td>
                        <td className="px-6 py-4 min-w-36">
                          {cls.avgScore !== null ? (
                            <ScoreBar
                              value={cls.avgScore}
                              color={cls.avgScore >= 75 ? 'bg-green-500' : cls.avgScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}
                            />
                          ) : (
                            <span className="text-sm text-gray-500">No data</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quiz breakdown table */}
          {quizzes.length > 0 && (
            <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800">
                <h2 className="text-base font-semibold text-gray-100">Quiz Breakdown</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Class</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Questions</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Attempts</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider min-w-36">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {quizzes.map((q) => (
                      <tr key={q.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-100 max-w-48 truncate">{q.title}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">{q.class_name ?? '—'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded border ${
                            q.status === 'published'
                              ? 'bg-green-900/40 text-green-300 border-green-800'
                              : q.status === 'draft'
                              ? 'bg-yellow-900/40 text-yellow-300 border-yellow-800'
                              : 'bg-gray-800 text-gray-500 border-gray-700'
                          }`}>
                            {q.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">{q.question_count}</td>
                        <td className="px-6 py-4 text-sm text-gray-300">{q.attempt_count}</td>
                        <td className="px-6 py-4 min-w-36">
                          {q.avg_score !== null ? (
                            <ScoreBar
                              value={q.avg_score}
                              color={q.avg_score >= 75 ? 'bg-green-500' : q.avg_score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}
                            />
                          ) : (
                            <span className="text-sm text-gray-500">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Struggling Students */}
          <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-100">Struggling Students</h2>
                <p className="text-xs text-gray-500 mt-0.5">Students whose average score is below the threshold</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={alertClassId}
                  onChange={(e) => setAlertClassId(e.target.value)}
                  className="px-2 py-1.5 text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded-lg focus:outline-none"
                >
                  <option value="">All classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Threshold</span>
                  <select
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="px-2 py-1.5 text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded-lg focus:outline-none"
                  >
                    {[30, 40, 50, 60, 70].map((t) => (
                      <option key={t} value={t}>{t}%</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {strugglingLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
              </div>
            ) : !strugglingData || strugglingData.items.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-green-400 text-sm font-medium">No struggling students</p>
                <p className="text-gray-500 text-xs mt-1">All students are above the {threshold}% threshold</p>
              </div>
            ) : (
              <>
                <div className="px-6 py-3 bg-red-950/20 border-b border-red-900/30 flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-xs text-red-400 font-medium">{strugglingData.total} student{strugglingData.total !== 1 ? 's' : ''} need attention (avg score &lt; {threshold}%)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Student</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Class</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Attempts</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider min-w-36">Avg Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {strugglingData.items.map((s) => {
                        const name = [s.first_name, s.last_name].filter(Boolean).join(' ') || s.email;
                        const severity = s.avg_score < 30 ? 'text-red-400' : 'text-orange-400';
                        return (
                          <tr key={`${s.student_id}-${s.class_id}`} className="hover:bg-gray-800/30 transition-colors">
                            <td className="px-6 py-4">
                              <Link href={`/dashboard/teacher/students/${s.student_id}`} className="text-sm font-medium text-gray-100 hover:text-primary-400 transition-colors">
                                {name}
                              </Link>
                              <p className="text-xs text-gray-500">{s.email}</p>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-400">{s.class_name}</td>
                            <td className="px-6 py-4 text-sm text-gray-300">{s.attempt_count}</td>
                            <td className="px-6 py-4 min-w-36">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-gray-800 rounded-full">
                                  <div className="h-1.5 rounded-full bg-red-500" style={{ width: `${s.avg_score}%` }} />
                                </div>
                                <span className={`text-sm font-semibold w-12 text-right ${severity}`}>{s.avg_score}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
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
