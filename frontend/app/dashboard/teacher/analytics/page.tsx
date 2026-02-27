'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import Link from 'next/link';

const weeklyActivity = [
  { day: 'Mon', submissions: 8, logins: 22 },
  { day: 'Tue', submissions: 12, logins: 34 },
  { day: 'Wed', submissions: 5, logins: 18 },
  { day: 'Thu', submissions: 15, logins: 40 },
  { day: 'Fri', submissions: 10, logins: 28 },
  { day: 'Sat', submissions: 2, logins: 8 },
  { day: 'Sun', submissions: 1, logins: 5 },
];

const topClasses = [
  { name: 'Mathematics 101', students: 32, avgScore: 78, engagement: 92 },
  { name: 'Physics Advanced', students: 18, avgScore: 65, engagement: 74 },
  { name: 'English Literature', students: 24, avgScore: 81, engagement: 88 },
  { name: 'Biology Basic', students: 28, avgScore: 72, engagement: 80 },
];

const maxSubmissions = Math.max(...weeklyActivity.map((d) => d.submissions));
const maxLogins = Math.max(...weeklyActivity.map((d) => d.logins));

export default function TeacherAnalyticsPage() {
  return (
    <ProtectedRoute allowedRoles={['TEACHER']}>
      <div className="bg-[#0a0a0f] min-h-full">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100">Analytics</h1>
            <p className="text-gray-400 mt-1">Track student performance and class engagement over time.</p>
          </div>

          {/* Coming soon banner */}
          <div className="mb-6 px-4 py-3 bg-yellow-950/50 border border-yellow-800/50 text-yellow-300 rounded-xl text-sm flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Real-time analytics are under development. Preview data is displayed below.
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Students', value: '102', change: '+8%', positive: true },
              { label: 'Avg. Score', value: '74%', change: '+3%', positive: true },
              { label: 'Avg. Engagement', value: '83%', change: '-2%', positive: false },
              { label: 'Quizzes Completed', value: '72', change: '+12%', positive: true },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <p className="text-sm text-gray-400 mb-1">{kpi.label}</p>
                <p className="text-3xl font-bold text-gray-100">{kpi.value}</p>
                <p className={`text-xs font-medium mt-1 ${kpi.positive ? 'text-green-400' : 'text-red-400'}`}>
                  {kpi.change} this month
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Weekly activity chart (submissions) */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-base font-semibold text-gray-100 mb-4">Weekly Submissions</h2>
              <div className="flex items-end gap-2 h-32">
                {weeklyActivity.map((d) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-primary-600/70 rounded-t-sm hover:bg-primary-500 transition-colors"
                      style={{ height: `${(d.submissions / maxSubmissions) * 100}%` }}
                      title={`${d.submissions} submissions`}
                    />
                    <span className="text-xs text-gray-500">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly logins chart */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-base font-semibold text-gray-100 mb-4">Weekly Student Logins</h2>
              <div className="flex items-end gap-2 h-32">
                {weeklyActivity.map((d) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-blue-600/70 rounded-t-sm hover:bg-blue-500 transition-colors"
                      style={{ height: `${(d.logins / maxLogins) * 100}%` }}
                      title={`${d.logins} logins`}
                    />
                    <span className="text-xs text-gray-500">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Class performance table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="text-base font-semibold text-gray-100">Class Performance</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Students</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Avg Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Engagement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {topClasses.map((cls) => (
                    <tr key={cls.name} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-100">{cls.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{cls.students}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-800 rounded-full max-w-24">
                            <div
                              className={`h-1.5 rounded-full ${cls.avgScore >= 75 ? 'bg-green-500' : 'bg-yellow-500'}`}
                              style={{ width: `${cls.avgScore}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-300">{cls.avgScore}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-800 rounded-full max-w-24">
                            <div
                              className="h-1.5 rounded-full bg-blue-500"
                              style={{ width: `${cls.engagement}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-300">{cls.engagement}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
