'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface Class {
  id: string;
  name: string;
  description: string;
  student_count: number;
  created_at: string;
}

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/classes`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setClasses(data.items || []);
        }
      } catch (error) {
        console.error('Failed to fetch classes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClasses();
  }, []);

  const stats = [
    { label: 'Mes Classes', value: classes.length.toString(), icon: '📚' },
    { label: 'Total Étudiants', value: classes.reduce((acc, c) => acc + c.student_count, 0).toString(), icon: '👨‍🎓' },
    { label: 'Documents', value: '24', icon: '📄' },
    { label: 'Quiz Créés', value: '12', icon: '📝' },
  ];

  const recentStudents = [
    { name: 'Alice Martin', class: 'Mathématiques Avancées', joined: 'Aujourd\'hui' },
    { name: 'Bob Dupont', class: 'Physique Chimie', joined: 'Hier' },
    { name: 'Caroline Bernard', class: 'Mathématiques Avancées', joined: 'Il y a 2 jours' },
  ];

  return (
    <ProtectedRoute allowedRoles={['TEACHER']}>
      <div className="min-h-screen bg-gray-50">
        {/* Teacher Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900">Tableau de bord Enseignant</h1>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                  Enseignant
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
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800">
              Bonjour, {user?.profile?.first_name} ! 👋
            </h2>
            <p className="text-gray-600 mt-1">
              Gérez vos classes, vos étudiants et votre contenu pédagogique.
            </p>
          </div>

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
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Classes Section */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Mes Classes</h2>
                  <Link
                    href="/dashboard/teacher/classes/new"
                    className="text-sm bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
                  >
                    + Nouvelle classe
                  </Link>
                </div>
                <div className="p-6">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                    </div>
                  ) : classes.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">Vous n&apos;avez pas encore de classes</p>
                      <Link
                        href="/dashboard/teacher/classes/new"
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Créer votre première classe →
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {classes.map((cls) => (
                        <div
                          key={cls.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{cls.name}</h3>
                            <p className="text-sm text-gray-500">{cls.description || 'Pas de description'}</p>
                            <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
                              <span>👨‍🎓 {cls.student_count} étudiants</span>
                              <span>📅 {new Date(cls.created_at).toLocaleDateString('fr-FR')}</span>
                            </div>
                          </div>
                          <Link
                            href={`/dashboard/teacher/classes/${cls.id}`}
                            className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                          >
                            Gérer →
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Actions rapides</h2>
                </div>
                <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Link
                    href="/dashboard/teacher/documents"
                    className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <span className="text-2xl mb-2">📄</span>
                    <span className="text-sm font-medium text-blue-900 text-center">Documents</span>
                  </Link>
                  <Link
                    href="/dashboard/teacher/quiz"
                    className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <span className="text-2xl mb-2">📝</span>
                    <span className="text-sm font-medium text-green-900 text-center">Quiz</span>
                  </Link>
                  <Link
                    href="/dashboard/teacher/career"
                    className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <span className="text-2xl mb-2">🎯</span>
                    <span className="text-sm font-medium text-purple-900 text-center">Carrière</span>
                  </Link>
                  <Link
                    href="/dashboard/teacher/analytics"
                    className="flex flex-col items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                  >
                    <span className="text-2xl mb-2">📊</span>
                    <span className="text-sm font-medium text-yellow-900 text-center">Analytics</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Recent Students */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Nouveaux étudiants</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {recentStudents.map((student, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium">
                          {student.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{student.name}</p>
                          <p className="text-xs text-gray-500">{student.class}</p>
                        </div>
                        <span className="text-xs text-gray-400">{student.joined}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Teacher Profile */}
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
                      <p className="text-xs text-blue-600 font-medium">Enseignant</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Link
                      href="/dashboard/teacher/profile"
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Modifier mon profil →
                    </Link>
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
