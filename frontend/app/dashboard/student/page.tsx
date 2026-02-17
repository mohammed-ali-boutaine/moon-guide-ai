'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface Class {
  id: string;
  name: string;
  teacher_name: string;
  joined_at: string;
}

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [enrolledClasses, setEnrolledClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/classes`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setEnrolledClasses(data.classes || []);
        }
      } catch (error) {
        console.error('Failed to fetch classes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClasses();
  }, []);

  const progress = [
    { subject: 'Mathématiques', progress: 75, total: 20, completed: 15 },
    { subject: 'Physique', progress: 60, total: 15, completed: 9 },
    { subject: 'Chimie', progress: 90, total: 10, completed: 9 },
  ];

  const upcomingQuizzes = [
    { title: 'Algèbre linéaire', class: 'Mathématiques Avancées', date: 'Demain, 14:00' },
    { title: 'Mécanique quantique', class: 'Physique', date: 'Dans 3 jours' },
    { title: 'Réactions chimiques', class: 'Chimie', date: 'Dans 5 jours' },
  ];

  const recentDocuments = [
    { title: 'Cours - Dérivées partielles', class: 'Mathématiques', date: 'Il y a 2 heures' },
    { title: 'TD - Lois de Newton', class: 'Physique', date: 'Hier' },
    { title: 'Labo - Titrage acide-base', class: 'Chimie', date: 'Il y a 2 jours' },
  ];

  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <div className="min-h-screen bg-gray-50">
        {/* Student Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900">Mon Espace Étudiant</h1>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                  Étudiant
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
              Bonjour, {user?.profile?.first_name} ! 🎓
            </h2>
            <p className="text-gray-600 mt-1">
              Continuez votre apprentissage et suivez vos progrès.
            </p>
          </div>

          {/* Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {progress.map((item, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-6">
                <h3 className="font-medium text-gray-900 mb-2">{item.subject}</h3>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-primary-600">{item.progress}%</span>
                  <span className="text-sm text-gray-500">{item.completed}/{item.total} quiz</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all"
                    style={{ width: `${item.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* My Classes */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Mes Classes</h2>
                  <Link
                    href="/dashboard/student/classes"
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Voir tout →
                  </Link>
                </div>
                <div className="p-6">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                    </div>
                  ) : enrolledClasses.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">Vous n&apos;êtes inscrit à aucune classe</p>
                      <Link
                        href="/dashboard/student/browse"
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Parcourir les classes →
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {enrolledClasses.slice(0, 3).map((cls) => (
                        <div
                          key={cls.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{cls.name}</h3>
                            <p className="text-sm text-gray-500">Prof. {cls.teacher_name}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              Inscrit depuis {new Date(cls.joined_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <Link
                            href={`/dashboard/student/classes/${cls.id}`}
                            className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                          >
                            Accéder →
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Documents */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Documents récents</h2>
                  <Link
                    href="/dashboard/student/documents"
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Voir tout →
                  </Link>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {recentDocuments.map((doc, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600">📄</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{doc.title}</p>
                          <p className="text-xs text-gray-500">{doc.class} • {doc.date}</p>
                        </div>
                        <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                          Ouvrir
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Upcoming Quizzes */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Quiz à venir</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {upcomingQuizzes.map((quiz, index) => (
                      <div key={index} className="border-l-4 border-primary-500 pl-4 py-2">
                        <p className="font-medium text-gray-900 text-sm">{quiz.title}</p>
                        <p className="text-xs text-gray-500">{quiz.class}</p>
                        <p className="text-xs text-primary-600 font-medium mt-1">{quiz.date}</p>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/dashboard/student/quiz"
                    className="block mt-4 text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Voir tous les quiz →
                  </Link>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Actions rapides</h2>
                </div>
                <div className="p-6 grid grid-cols-2 gap-4">
                  <Link
                    href="/dashboard/student/quiz"
                    className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <span className="text-2xl mb-2">📝</span>
                    <span className="text-sm font-medium text-blue-900 text-center">Quiz</span>
                  </Link>
                  <Link
                    href="/dashboard/student/career"
                    className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <span className="text-2xl mb-2">🎯</span>
                    <span className="text-sm font-medium text-purple-900 text-center">Carrière</span>
                  </Link>
                  <Link
                    href="/dashboard/student/documents"
                    className="flex flex-col items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                  >
                    <span className="text-2xl mb-2">📄</span>
                    <span className="text-sm font-medium text-yellow-900 text-center">Documents</span>
                  </Link>
                  <Link
                    href="/dashboard/student/help"
                    className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <span className="text-2xl mb-2">❓</span>
                    <span className="text-sm font-medium text-green-900 text-center">Aide IA</span>
                  </Link>
                </div>
              </div>

              {/* Student Profile */}
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
                      <p className="text-xs text-green-600 font-medium">Étudiant</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Link
                      href="/dashboard/student/profile"
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
