'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/contexts/auth-context';
import { useClassContext } from '@/contexts/class-context';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { UsersIcon, DocumentIcon, QuizIcon, ChartIcon, CalendarIcon } from '@/components/ui/icons';

interface RecentStudentApi {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  joined_at: string;
  class_id: string;
  class_name: string;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { classes, selectedClass, selectedClassId } = useClassContext();

  const displayedClasses = selectedClassId
    ? classes.filter((c) => c.id === selectedClassId)
    : classes;

  const totalStudents = displayedClasses.reduce((acc, c) => acc + c.student_count, 0);

  const [recentStudents, setRecentStudents] = useState<{
    name: string;
    class: string;
    joined: string;
  }[]>([]);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/classes/recent-joins?limit=5`,
          { credentials: 'include' }
        );
        if (!res.ok) return;
        const data: RecentStudentApi[] = await res.json();
        setRecentStudents(
          data.map((s) => ({
            name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.email,
            class: s.class_name,
            joined: formatJoined(s.joined_at),
          }))
        );
      } catch (err) {
        console.error('Failed to fetch recent students', err);
      }
    };
    fetchRecent();
  }, []);

  function formatJoined(iso: string) {
    try {
      const d = new Date(iso);
      const now = new Date();
      const msPerDay = 24 * 60 * 60 * 1000;
      const diffDays = Math.floor((now.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / msPerDay);
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      return d.toLocaleDateString();
    } catch {
      return iso;
    }
  }

  const filteredRecent = selectedClass
    ? recentStudents.filter((s) => s.class === selectedClass.name)
    : recentStudents;

  // All quick actions — class-scoped when a class is selected
  const actions = selectedClassId ? [
    {
      label: 'Documents',
      href: `/dashboard/teacher/classes/${selectedClassId}/documents`,
      color: 'bg-blue-950/50 border-blue-900/50 hover:bg-blue-950',
      textColor: 'text-blue-300',
      icon: <DocumentIcon className="w-7 h-7 mb-2 text-blue-400" />,
    },
    {
      label: 'Create Quiz',
      href: `/dashboard/teacher/classes/${selectedClassId}/quiz/create`,
      color: 'bg-green-950/50 border-green-900/50 hover:bg-green-950',
      textColor: 'text-green-300',
      icon: <QuizIcon className="w-7 h-7 mb-2 text-green-400" />,
    },
    {
      label: 'Students',
      href: `/dashboard/teacher/classes/${selectedClassId}`,
      color: 'bg-purple-950/50 border-purple-900/50 hover:bg-purple-950',
      textColor: 'text-purple-300',
      icon: <UsersIcon className="w-7 h-7 mb-2 text-purple-400" />,
    },
    {
      label: 'Analytics',
      href: '/dashboard/teacher/analytics',
      color: 'bg-yellow-950/50 border-yellow-900/50 hover:bg-yellow-950',
      textColor: 'text-yellow-300',
      icon: <ChartIcon className="w-7 h-7 mb-2 text-yellow-400" />,
    },
  ] : [
    {
      label: 'Documents',
      href: '/dashboard/teacher/documents',
      color: 'bg-blue-950/50 border-blue-900/50 hover:bg-blue-950',
      textColor: 'text-blue-300',
      icon: <DocumentIcon className="w-7 h-7 mb-2 text-blue-400" />,
    },
    {
      label: 'Quizzes',
      href: '/dashboard/teacher/quizzes',
      color: 'bg-green-950/50 border-green-900/50 hover:bg-green-950',
      textColor: 'text-green-300',
      icon: <QuizIcon className="w-7 h-7 mb-2 text-green-400" />,
    },
    {
      label: 'Analytics',
      href: '/dashboard/teacher/analytics',
      color: 'bg-yellow-950/50 border-yellow-900/50 hover:bg-yellow-950',
      textColor: 'text-yellow-300',
      icon: <ChartIcon className="w-7 h-7 mb-2 text-yellow-400" />,
    },
  ];

  return (
    <ProtectedRoute allowedRoles={['TEACHER']}>
      <div className="bg-[#0a0a0f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Welcome */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-100">
              Hello, {user?.profile?.first_name}!
            </h2>
            <p className="text-gray-400 mt-1">
              {selectedClass
                ? `Viewing: ${selectedClass.name}`
                : 'Manage your classes, students, and teaching content.'}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">
                  {selectedClass ? 'Class' : 'My Classes'}
                </p>
                <p className="text-3xl font-bold text-gray-100 mt-1">
                  {selectedClass ? 1 : classes.length}
                </p>
              </div>
              <div className="text-gray-600">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Students</p>
                <p className="text-3xl font-bold text-gray-100 mt-1">{totalStudents}</p>
              </div>
              <div className="text-gray-600"><UsersIcon className="w-8 h-8" /></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main */}
            <div className="lg:col-span-2 space-y-8">

              {/* Quick Actions — merges class-specific links when class selected */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl">
                <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-100">Quick Actions</h2>
                    {selectedClass && (
                      <p className="text-xs text-gray-500 mt-0.5">Scoped to: {selectedClass.name}</p>
                    )}
                  </div>
                  {selectedClass && (
                    <Link
                      href={`/dashboard/teacher/classes/${selectedClass.id}`}
                      className="text-sm text-primary-400 hover:text-primary-300 font-medium"
                    >
                      Manage class →
                    </Link>
                  )}
                </div>
                <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {actions.map((action) => (
                    <Link
                      key={action.label}
                      href={action.href}
                      className={`flex flex-col items-center p-4 ${action.color} border rounded-xl transition-colors`}
                    >
                      {action.icon}
                      <span className={`text-sm font-medium ${action.textColor} text-center`}>{action.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Classes list — only shown when no specific class selected */}
              {!selectedClass && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl">
                  <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-100">My Classes</h2>
                    <Link
                      href="/dashboard/teacher/classes"
                      className="text-sm bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      Manage all
                    </Link>
                  </div>
                  <div className="p-6">
                    {classes.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500 mb-2">No classes yet.</p>
                        <p className="text-sm text-gray-600">Use the <span className="text-primary-400">+</span> button in the top bar to create one.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {classes.map((cls) => (
                          <div key={cls.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition-colors">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-100 truncate">{cls.name}</h3>
                              <div className="flex items-center mt-1 gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1"><UsersIcon className="w-3.5 h-3.5" /> {cls.student_count}</span>
                                <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" /> {new Date(cls.created_at).toLocaleDateString('en-US')}</span>
                              </div>
                            </div>
                            <Link href={`/dashboard/teacher/classes/${cls.id}`} className="text-primary-400 hover:text-primary-300 font-medium text-sm shrink-0 ml-4">
                              Manage →
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h2 className="text-lg font-semibold text-gray-100">New Students</h2>
                </div>
                <div className="p-6 space-y-4">
                  {filteredRecent.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No recent joins</p>
                  ) : (
                    filteredRecent.map((student, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-medium text-xs shrink-0">
                          {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-200 truncate">{student.name}</p>
                          <p className="text-xs text-gray-500 truncate">{student.class}</p>
                        </div>
                        <span className="text-xs text-gray-600 shrink-0">{student.joined}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
