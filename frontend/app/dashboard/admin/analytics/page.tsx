'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useNotification } from '@/contexts/notification-context';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface PlatformAnalytics {
  total_quizzes: number;
  total_attempts: number;
  avg_score: number | null;
  score_distribution: {
    excellent: number;
    good: number;
    average: number;
    below_average: number;
  };
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-950/50 border-blue-900/50 text-blue-400',
  purple: 'bg-purple-950/50 border-purple-900/50 text-purple-400',
  green: 'bg-green-950/50 border-green-900/50 text-green-400',
  yellow: 'bg-yellow-950/50 border-yellow-900/50 text-yellow-400',
  red: 'bg-red-950/50 border-red-900/50 text-red-400',
};

const BarChartIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M9 17V9m4 8v-5m4 5V5" />
  </svg>
);

export default function AdminAnalyticsPage() {
  const { error: notifyError } = useNotification();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/analytics`, { credentials: 'include' });
        if (!res.ok) throw new Error();
        setAnalytics(await res.json());
      } catch {
        notifyError('Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [API_URL]);

  if (loading) return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="flex justify-center py-20"><LoadingSpinner /></div>
    </ProtectedRoute>
  );

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-xl font-bold text-gray-100 mb-6">Analytics</h1>

        {!analytics ? (
          <p className="text-gray-500 text-sm">No analytics data available.</p>
        ) : (
          <div className="space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Total Quizzes', value: analytics.total_quizzes.toLocaleString(), color: 'blue' },
                { label: 'Total Attempts', value: analytics.total_attempts.toLocaleString(), color: 'purple' },
                {
                  label: 'Platform Avg. Score',
                  value: analytics.avg_score !== null ? `${analytics.avg_score}%` : '—',
                  color: analytics.avg_score !== null
                    ? analytics.avg_score >= 75 ? 'green'
                    : analytics.avg_score >= 50 ? 'yellow'
                    : 'red'
                    : 'yellow',
                },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex items-center gap-4">
                  <div className={`p-3 rounded-xl border ${colorMap[color]}`}><BarChartIcon /></div>
                  <div>
                    <p className="text-2xl font-bold text-gray-100">{value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Score distribution */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-base font-semibold text-gray-100 mb-4">Score Distribution</h2>
              {analytics.total_attempts === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">No quiz attempts yet.</p>
              ) : (() => {
                const total = analytics.total_attempts;
                const bands = [
                  { label: 'Excellent (≥ 90%)', count: analytics.score_distribution.excellent, color: 'bg-green-500' },
                  { label: 'Good (75–89%)', count: analytics.score_distribution.good, color: 'bg-green-600' },
                  { label: 'Average (50–74%)', count: analytics.score_distribution.average, color: 'bg-yellow-500' },
                  { label: 'Below Average (< 50%)', count: analytics.score_distribution.below_average, color: 'bg-red-500' },
                ];
                return (
                  <div className="space-y-3">
                    {bands.map(band => (
                      <div key={band.label} className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-40 shrink-0">{band.label}</span>
                        <div className="flex-1 h-2.5 bg-gray-800 rounded-full">
                          <div
                            className={`h-2.5 rounded-full ${band.color}`}
                            style={{ width: `${total > 0 ? (band.count / total) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-20 text-right">
                          {band.count} ({total > 0 ? Math.round((band.count / total) * 100) : 0}%)
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Summary table */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-base font-semibold text-gray-100 mb-4">Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                {[
                  { label: 'Excellent', count: analytics.score_distribution.excellent, color: 'text-green-400' },
                  { label: 'Good', count: analytics.score_distribution.good, color: 'text-green-500' },
                  { label: 'Average', count: analytics.score_distribution.average, color: 'text-yellow-400' },
                  { label: 'Below Avg.', count: analytics.score_distribution.below_average, color: 'text-red-400' },
                ].map(item => (
                  <div key={item.label} className="bg-gray-800/50 rounded-xl p-4">
                    <p className={`text-2xl font-bold ${item.color}`}>{item.count}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
