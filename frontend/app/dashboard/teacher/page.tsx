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
          headers: { 'Authorization': `Bearer ${token}` },
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
    { label: 'My Classes', value: classes.length.toString(), icon: '📚' },
    { label: 'Total Students', value: classes.reduce((acc, c) => acc + c.student_count, 0).toString(), icon: '👨‍🎓' },
    { label: 'Documents', value: '24', icon: '📄' },
    { label: 'Quizzes Created', value: '12', icon: '📝' },
  ];

  const recentStudents = [
    { name: 'Alice Martin', class: 'Advanced Mathematics', joined: 'Today' },
    { name: 'Bob Dupont', class: 'Physics & Chemistry', joined: 'Yesterday' },
    { name: 'Caroline Bernard', class: 'Advanced Mathematics', joined: '2 days ago' },
  ];

  return (
    <ProtectedRoute allowedRoles={['TEACHER']}>
      <div className="min-h-screen bg-[#0a0a0f]">
        {/* Header */}
        <header className="bg-gray-900 border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-100">Teacher Dashboard</h1>
                <span className="px-3 py-1 bg-blue-900/50 text-blue-300 text-sm font-medium rounded-full border border-blue-800">
                  Teacher
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-400">
                  {user?.profile?.first_name} {user?.profile?.last_name}
                </span>
                <button onClick={logout} className="text-sm text-red-400 hover:text-red-300 font-medium">
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-100">
              Hello, {user?.profile?.first_name}! 👋
            </h2>
            <p className="text-gray-400 mt-1">
              Manage your classes, students, and teaching content.
            </p>
          </div>

          {/* Stats */}
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
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main */}
            <div className="lg:col-span-2 space-y-8">
              {/* Classes */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl">
                <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-100">My Classes</h2>
                  <Link
                    href="/dashboard/teacher/classes/new"
                    className="text-sm bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    + New Class
                  </Link>
                </div>
                <div className="p-6">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                    </div>
                  ) : classes.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">You don&apos;t have any classes yet</p>
                      <Link href="/dashboard/teacher/classes/new" className="text-primary-400 hover:text-primary-300 font-medium">
                        Create your first class →
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {classes.map((cls) => (
                        <div key={cls.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition-colors">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-100">{cls.name}</h3>
                            <p className="text-sm text-gray-400">{cls.description || 'No description'}</p>
                            <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                              <span>👨‍🎓 {cls.student_count} students</span>
                              <span>📅 {new Date(cls.created_at).toLocaleDateString('en-US')}</span>
                            </div>
                          </div>
                          <Link href={`/dashboard/teacher/classes/${cls.id}`} className="text-primary-400 hover:text-primary-300 font-medium text-sm">
                            Manage →
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h2 className="text-lg font-semibold text-gray-100">Quick Actions</h2>
                </div>
                <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Link href="/dashboard/teacher/documents" className="flex flex-col items-center p-4 bg-blue-950/50 border border-blue-900/50 rounded-xl hover:bg-blue-950 transition-colors">
                    <span className="text-2xl mb-2">📄</span>
                    <span className="text-sm font-medium text-blue-300 text-center">Documents</span>
                  </Link>
                  <Link href="/dashboard/teacher/quiz" className="flex flex-col items-center p-4 bg-green-950/50 border border-green-900/50 rounded-xl hover:bg-green-950 transition-colors">
                    <span className="text-2xl mb-2">📝</span>
                    <span className="text-sm font-medium text-green-300 text-center">Quiz</span>
                  </Link>
                  <Link href="/dashboard/teacher/career" className="flex flex-col items-center p-4 bg-purple-950/50 border border-purple-900/50 rounded-xl hover:bg-purple-950 transition-colors">
                    <span className="text-2xl mb-2">🎯</span>
                    <span className="text-sm font-medium text-purple-300 text-center">Career</span>
                  </Link>
                  <Link href="/dashboard/teacher/analytics" className="flex flex-col items-center p-4 bg-yellow-950/50 border border-yellow-900/50 rounded-xl hover:bg-yellow-950 transition-colors">
                    <span className="text-2xl mb-2">📊</span>
                    <span className="text-sm font-medium text-yellow-300 text-center">Analytics</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Recent Students */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h2 className="text-lg font-semibold text-gray-100">New Students</h2>
                </div>
                <div className="p-6 space-y-4">
                  {recentStudents.map((student, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-medium text-sm">
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-200">{student.name}</p>
                        <p className="text-xs text-gray-500">{student.class}</p>
                      </div>
                      <span className="text-xs text-gray-600">{student.joined}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Teacher Profile */}
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
                      <p className="font-medium text-gray-100">{user?.profile?.first_name} {user?.profile?.last_name}</p>
                      <p className="text-sm text-gray-500">{user?.email}</p>
                      <p className="text-xs text-blue-400 font-medium">Teacher</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <Link href="/dashboard/teacher/profile" className="text-sm text-primary-400 hover:text-primary-300 font-medium">
                      Edit profile →
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