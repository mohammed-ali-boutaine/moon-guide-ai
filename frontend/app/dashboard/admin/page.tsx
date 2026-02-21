'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';

export default function AdminDashboard() {
  const { user, logout } = useAuth();

  const stats = [
    { label: 'Users', value: '1,234', icon: '👥', change: '+12%' },
    { label: 'Teachers', value: '56', icon: '👨‍🏫', change: '+5%' },
    { label: 'Students', value: '1,178', icon: '👨‍🎓', change: '+15%' },
    { label: 'Classes', value: '89', icon: '📚', change: '+8%' },
  ];

  const recentActivities = [
    { action: 'New user registered', user: 'john.doe@email.com', time: '2 min ago' },
    { action: 'Class created', user: 'Prof. Martin', time: '15 min ago' },
    { action: 'Quiz completed', user: 'Alice Smith', time: '1 hour ago' },
    { action: 'Document uploaded', user: 'Prof. Dubois', time: '2 hours ago' },
  ];

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="min-h-screen bg-[#0a0a0f]">
        {/* Admin Header */}
        <header className="bg-gray-900 border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-100">Admin Dashboard</h1>
                <span className="px-3 py-1 bg-purple-900/50 text-purple-300 text-sm font-medium rounded-full border border-purple-800">
                  Administrator
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-400">
                  {user?.profile?.first_name} {user?.profile?.last_name}
                </span>
                <button
                  onClick={logout}
                  className="text-sm text-red-400 hover:text-red-300 font-medium"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div key={index} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-100 mt-1">{stat.value}</p>
                  </div>
                  <span className="text-3xl">{stat.icon}</span>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <span className="text-green-400 font-medium">{stat.change}</span>
                  <span className="text-gray-500 ml-2">this month</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Quick Actions */}
            <div className="lg:col-span-2">
              <div className="bg-gray-900 border border-gray-800 rounded-xl">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h2 className="text-lg font-semibold text-gray-100">Quick Actions</h2>
                </div>
                <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Link href="/admin/users" className="flex flex-col items-center p-4 bg-blue-950/50 border border-blue-900/50 rounded-xl hover:bg-blue-950 transition-colors">
                    <span className="text-2xl mb-2">👥</span>
                    <span className="text-sm font-medium text-blue-300">Manage Users</span>
                  </Link>
                  <Link href="/admin/classes" className="flex flex-col items-center p-4 bg-green-950/50 border border-green-900/50 rounded-xl hover:bg-green-950 transition-colors">
                    <span className="text-2xl mb-2">📚</span>
                    <span className="text-sm font-medium text-green-300">Manage Classes</span>
                  </Link>
                  <Link href="/admin/content" className="flex flex-col items-center p-4 bg-yellow-950/50 border border-yellow-900/50 rounded-xl hover:bg-yellow-950 transition-colors">
                    <span className="text-2xl mb-2">📄</span>
                    <span className="text-sm font-medium text-yellow-300">Content</span>
                  </Link>
                  <Link href="/admin/analytics" className="flex flex-col items-center p-4 bg-purple-950/50 border border-purple-900/50 rounded-xl hover:bg-purple-950 transition-colors">
                    <span className="text-2xl mb-2">📊</span>
                    <span className="text-sm font-medium text-purple-300">Analytics</span>
                  </Link>
                  <Link href="/admin/settings" className="flex flex-col items-center p-4 bg-gray-800/50 border border-gray-700/50 rounded-xl hover:bg-gray-800 transition-colors">
                    <span className="text-2xl mb-2">⚙️</span>
                    <span className="text-sm font-medium text-gray-300">Settings</span>
                  </Link>
                  <Link href="/admin/support" className="flex flex-col items-center p-4 bg-red-950/50 border border-red-900/50 rounded-xl hover:bg-red-950 transition-colors">
                    <span className="text-2xl mb-2">🎧</span>
                    <span className="text-sm font-medium text-red-300">Support</span>
                  </Link>
                </div>
              </div>

              {/* System Status */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl mt-8">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h2 className="text-lg font-semibold text-gray-100">System Status</h2>
                </div>
                <div className="p-6 space-y-4">
                  {[
                    { name: 'API Backend', status: 'Operational', ok: true },
                    { name: 'Database', status: 'Operational', ok: true },
                    { name: 'AI Service', status: 'Operational', ok: true },
                    { name: 'Storage', status: '85% used', ok: false },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`h-2.5 w-2.5 rounded-full mr-3 ${item.ok ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                        <span className="text-sm text-gray-300">{item.name}</span>
                      </div>
                      <span className={`text-sm font-medium ${item.ok ? 'text-green-400' : 'text-yellow-400'}`}>{item.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Recent Activity */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h2 className="text-lg font-semibold text-gray-100">Recent Activity</h2>
                </div>
                <div className="p-6 space-y-4">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="h-2 w-2 bg-primary-500 rounded-full mt-2 shrink-0"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">{activity.action}</p>
                        <p className="text-xs text-gray-500">{activity.user}</p>
                        <p className="text-xs text-gray-600">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin Profile */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h2 className="text-lg font-semibold text-gray-100">My Profile</h2>
                </div>
                <div className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold text-lg">
                      {user?.profile?.first_name?.[0]}{user?.profile?.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-100">
                        {user?.profile?.first_name} {user?.profile?.last_name}
                      </p>
                      <p className="text-sm text-gray-500">{user?.email}</p>
                      <p className="text-xs text-purple-400 font-medium">Administrator</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}