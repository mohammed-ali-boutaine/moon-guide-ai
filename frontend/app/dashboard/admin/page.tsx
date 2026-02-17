'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';

export default function AdminDashboard() {
  const { user, logout } = useAuth();

  const stats = [
    { label: 'Utilisateurs', value: '1,234', icon: '👥', change: '+12%' },
    { label: 'Enseignants', value: '56', icon: '👨‍🏫', change: '+5%' },
    { label: 'Étudiants', value: '1,178', icon: '👨‍🎓', change: '+15%' },
    { label: 'Classes', value: '89', icon: '📚', change: '+8%' },
  ];

  const recentActivities = [
    { action: 'Nouvel utilisateur inscrit', user: 'john.doe@email.com', time: '2 min ago' },
    { action: 'Classe créée', user: 'Prof. Martin', time: '15 min ago' },
    { action: 'Quiz complété', user: 'Alice Smith', time: '1 heure ago' },
    { action: 'Document uploadé', user: 'Prof. Dubois', time: '2 heures ago' },
  ];

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="min-h-screen bg-gray-50">
        {/* Admin Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900">Tableau de bord Admin</h1>
                <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                  Administrateur
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {user?.profile?.first_name} {user?.profile?.last_name}
                </span>
                <button
                  onClick={logout}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <span className="text-3xl">{stat.icon}</span>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <span className="text-green-600 font-medium">{stat.change}</span>
                  <span className="text-gray-500 ml-2">ce mois</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Quick Actions */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Actions rapides</h2>
                </div>
                <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Link
                    href="/admin/users"
                    className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <span className="text-2xl mb-2">👥</span>
                    <span className="text-sm font-medium text-blue-900">Gérer les utilisateurs</span>
                  </Link>
                  <Link
                    href="/admin/classes"
                    className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <span className="text-2xl mb-2">📚</span>
                    <span className="text-sm font-medium text-green-900">Gérer les classes</span>
                  </Link>
                  <Link
                    href="/admin/content"
                    className="flex flex-col items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                  >
                    <span className="text-2xl mb-2">📄</span>
                    <span className="text-sm font-medium text-yellow-900">Contenu</span>
                  </Link>
                  <Link
                    href="/admin/analytics"
                    className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <span className="text-2xl mb-2">📊</span>
                    <span className="text-sm font-medium text-purple-900">Analytics</span>
                  </Link>
                  <Link
                    href="/admin/settings"
                    className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-2xl mb-2">⚙️</span>
                    <span className="text-sm font-medium text-gray-900">Paramètres</span>
                  </Link>
                  <Link
                    href="/admin/support"
                    className="flex flex-col items-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <span className="text-2xl mb-2">🎧</span>
                    <span className="text-sm font-medium text-red-900">Support</span>
                  </Link>
                </div>
              </div>

              {/* System Status */}
              <div className="bg-white rounded-lg shadow mt-8">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">État du système</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-3 w-3 bg-green-500 rounded-full mr-3"></div>
                        <span className="text-sm text-gray-700">API Backend</span>
                      </div>
                      <span className="text-sm text-green-600 font-medium">Opérationnel</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-3 w-3 bg-green-500 rounded-full mr-3"></div>
                        <span className="text-sm text-gray-700">Base de données</span>
                      </div>
                      <span className="text-sm text-green-600 font-medium">Opérationnel</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-3 w-3 bg-green-500 rounded-full mr-3"></div>
                        <span className="text-sm text-gray-700">Service AI</span>
                      </div>
                      <span className="text-sm text-green-600 font-medium">Opérationnel</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-3 w-3 bg-yellow-500 rounded-full mr-3"></div>
                        <span className="text-sm text-gray-700">Stockage</span>
                      </div>
                      <span className="text-sm text-yellow-600 font-medium">85% utilisé</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Recent Activity */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Activité récente</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {recentActivities.map((activity, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="h-2 w-2 bg-primary-500 rounded-full mt-2"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                          <p className="text-xs text-gray-500">{activity.user}</p>
                          <p className="text-xs text-gray-400">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Admin Info */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Mon profil</h2>
                </div>
                <div className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold text-lg">
                      {user?.profile?.first_name?.[0]}{user?.profile?.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {user?.profile?.first_name} {user?.profile?.last_name}
                      </p>
                      <p className="text-sm text-gray-500">{user?.email}</p>
                      <p className="text-xs text-purple-600 font-medium">Administrateur</p>
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
