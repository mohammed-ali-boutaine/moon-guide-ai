'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/contexts/auth-context';
import { LoadingSpinner } from '@/components/ui';
import { useStudentClasses } from '@/hooks/use-classes';
import { useStudentAssignedQuizzes } from '@/hooks/use-quiz';
import { usePersonalDocuments } from '@/hooks/use-documents';
import Link from 'next/link';
import { BookIcon, QuizIcon, DocumentIcon, BriefcaseIcon, UserIcon, CheckCircleIcon } from '@/components/ui/icons';

function StudentDashboardContent() {
  const { user } = useAuth();

  const { data: classesData, isLoading } = useStudentClasses(1, 4);
  const { data: quizzesData, isLoading: isLoadingQuizzes } = useStudentAssignedQuizzes();
  const { data: documentsData, isLoading: isLoadingDocs } = usePersonalDocuments();

  const quizzes = quizzesData ?? [];
  const completedQuizzes = quizzes.filter((quiz) => quiz.attempt_status === 'submitted').length;
  const pendingQuizzes = quizzes.length - completedQuizzes;
  const totalDocuments = documentsData?.total ?? 0;
  const progressPercent = quizzes.length > 0 ? Math.round((completedQuizzes / quizzes.length) * 100) : 0;

  const recentAssignedQuizzes = [...quizzes]
    .sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime())
    .slice(0, 3);

  const upcomingDeadlines = [...quizzes]
    .filter((quiz) => quiz.attempt_status !== 'submitted' && quiz.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 3);

  const isLoadingStats = isLoading || isLoadingQuizzes || isLoadingDocs;

  const stats = [
    { label: 'My Classes', value: classesData?.total.toString() || '0', icon: <BookIcon className="w-8 h-8" />, color: 'blue' },
    { label: 'Pending Quizzes', value: pendingQuizzes.toString(), icon: <QuizIcon className="w-8 h-8" />, color: 'yellow' },
    { label: 'Completed Quizzes', value: completedQuizzes.toString(), icon: <CheckCircleIcon className="w-8 h-8" />, color: 'green' },
    { label: 'Documents', value: totalDocuments.toString(), icon: <DocumentIcon className="w-8 h-8" />, color: 'purple' },
  ];

  const quickActions = [
    { href: '/dashboard/student/classes', label: 'My Classes', icon: <BookIcon className="w-8 h-8" />, color: 'blue' },
    { href: '/dashboard/student/quizzes', label: 'Quizzes', icon: <QuizIcon className="w-8 h-8" />, color: 'green' },
    { href: '/dashboard/student/documents', label: 'Documents', icon: <DocumentIcon className="w-8 h-8" />, color: 'yellow' },
    { href: '/dashboard/student/career', label: 'Career Planning', icon: <BriefcaseIcon className="w-8 h-8" />, color: 'purple' },
    { href: '/me', label: 'My Profile', icon: <UserIcon className="w-8 h-8" />, color: 'gray' },
  ];

  const colorClasses: Record<string, { bg: string; border: string; text: string; hover: string }> = {
    blue: { bg: 'bg-blue-950/50', border: 'border-blue-900/50', text: 'text-blue-300', hover: 'hover:bg-blue-950' },
    green: { bg: 'bg-green-950/50', border: 'border-green-900/50', text: 'text-green-300', hover: 'hover:bg-green-950' },
    yellow: { bg: 'bg-yellow-950/50', border: 'border-yellow-900/50', text: 'text-yellow-300', hover: 'hover:bg-yellow-950' },
    purple: { bg: 'bg-purple-950/50', border: 'border-purple-900/50', text: 'text-purple-300', hover: 'hover:bg-purple-950' },
    indigo: { bg: 'bg-indigo-950/50', border: 'border-indigo-900/50', text: 'text-indigo-300', hover: 'hover:bg-indigo-950' },
    gray: { bg: 'bg-gray-800/50', border: 'border-gray-700/50', text: 'text-gray-300', hover: 'hover:bg-gray-800' },
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
        {/* Main Content */}
        <main className="flex-1 lg:ml-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Welcome Message */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                Welcome back, {user?.profile?.first_name || 'Student'}!
              </h1>
              <p className="text-gray-400">Here's what's happening with your learning journey</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, index) => (
                <div key={index} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-400">{stat.label}</p>
                      <p className="text-3xl font-bold text-gray-100 mt-1">{isLoadingStats ? '...' : stat.value}</p>
                    </div>
                    <div className="text-gray-600">{stat.icon}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Quick Actions */}
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-gray-900 border border-gray-800 rounded-xl">
                  <div className="px-6 py-4 border-b border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-100">Quick Actions</h2>
                  </div>
                  <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                    {quickActions.map((action, index) => {
                      const colors = colorClasses[action.color];
                      return (
                        <Link
                          key={index}
                          href={action.href}
                          className={`flex flex-col items-center p-4 ${colors.bg} border ${colors.border} rounded-xl ${colors.hover} transition-colors`}
                        >
                          <div className="text-gray-600 mb-2">{action.icon}</div>
                          <span className={`text-sm font-medium ${colors.text} text-center`}>{action.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Classes */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl">
                  <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-100">My Recent Classes</h2>
                    <Link href="/dashboard/student/classes" className="text-sm text-primary-400 hover:text-primary-300">
                      View All
                    </Link>
                  </div>
                  <div className="p-6">
                    {isLoading ? (
                      <div className="flex justify-center py-8">
                        <LoadingSpinner />
                      </div>
                    ) : classesData && classesData.items.length > 0 ? (
                      <div className="space-y-3">
                        {classesData.items.slice(0, 3).map((classItem) => {
                          const teacherName = `${classItem.teacher.first_name} ${classItem.teacher.last_name}`.trim() || classItem.teacher.email;
                          return (
                            <Link
                              key={classItem.id}
                              href={`/dashboard/student/classes/${classItem.id}`}
                              className="block p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors border border-gray-700 hover:border-primary-600"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-white mb-1">{classItem.name}</h3>
                                  <p className="text-sm text-gray-400">
                                    <span className="text-gray-500">Teacher:</span> {teacherName}
                                  </p>
                                </div>
                                <div className="ml-4 flex items-center gap-2 text-sm text-gray-400">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                                    />
                                  </svg>
                                  <span>{classItem.student_count}</span>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-800 rounded-full mb-3">
                          <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                          </svg>
                        </div>
                        <p className="text-gray-500 text-sm">No classes yet</p>
                        <p className="text-gray-600 text-xs mt-1">You'll see your classes here once enrolled</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recently Assigned Quizzes */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl">
                  <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-100">Recently Assigned Quizzes</h2>
                    <Link href="/dashboard/student/quizzes" className="text-sm text-primary-400 hover:text-primary-300">
                      View All
                    </Link>
                  </div>
                  <div className="p-6">
                    {isLoadingQuizzes ? (
                      <div className="flex justify-center py-8">
                        <LoadingSpinner />
                      </div>
                    ) : recentAssignedQuizzes.length > 0 ? (
                      <div className="space-y-3">
                        {recentAssignedQuizzes.map((quiz) => (
                          <Link
                            key={quiz.assignment_id}
                            href={`/dashboard/student/quizzes/${quiz.quiz.id}`}
                            className="block p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors border border-gray-700 hover:border-primary-600"
                          >
                            <h3 className="font-semibold text-white mb-1">{quiz.quiz.title}</h3>
                            <p className="text-xs text-gray-500">
                              {quiz.class_name}
                              {quiz.due_date && <> &middot; Due {new Date(quiz.due_date).toLocaleDateString()}</>}
                            </p>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500 text-sm">No quizzes assigned yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-8">
                {/* Upcoming Deadlines */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl">
                  <div className="px-6 py-4 border-b border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-100">Upcoming Deadlines</h2>
                  </div>
                  <div className="p-6">
                    {isLoadingQuizzes ? (
                      <div className="flex justify-center py-8">
                        <LoadingSpinner />
                      </div>
                    ) : upcomingDeadlines.length > 0 ? (
                      <div className="space-y-3">
                        {upcomingDeadlines.map((quiz) => (
                          <Link
                            key={quiz.assignment_id}
                            href={`/dashboard/student/quizzes/${quiz.quiz.id}`}
                            className="block p-3 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
                          >
                            <p className="text-sm font-medium text-gray-200">{quiz.quiz.title}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Due {new Date(quiz.due_date!).toLocaleDateString()} &middot; {quiz.class_name}
                            </p>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500 text-sm">No upcoming deadlines</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Overview */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl">
                  <div className="px-6 py-4 border-b border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-100">Learning Progress</h2>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Overall Progress</span>
                        <span className="text-primary-400 font-medium">{isLoadingQuizzes ? '...' : `${progressPercent}%`}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-800">
                      <p className="text-xs text-gray-500 text-center">
                        {quizzes.length > 0
                          ? `${completedQuizzes} of ${quizzes.length} assigned quizzes completed`
                          : 'Start taking quizzes to track your progress'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
    </div>
  );
}

export default function StudentDashboard() {
  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <StudentDashboardContent />
    </ProtectedRoute>
  );
}