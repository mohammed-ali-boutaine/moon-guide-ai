'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStudentClasses } from '@/hooks/use-classes';
import { LoadingSpinner } from '@/components/ui';
import Button from '@/components/ui/Button';
import { ProtectedRoute } from '@/components/auth';

function StudentClassDetailContent() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;


  // Fetch all classes and find the specific one
  // Note: Ideally there would be a dedicated endpoint for student class detail
  const { data: classesData, isLoading, error } = useStudentClasses(1, 100);

  const classDetail = classesData?.items.find((c) => c.id === classId);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#0a0a0f]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
    
          <main className="flex-1 lg:ml-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Class</h2>
                <p className="text-gray-300">
                  {error instanceof Error ? error.message : 'Failed to load class details'}
                </p>
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/student/classes')}
                  className="mt-4"
                >
                  Back to Classes
                </Button>
              </div>
            </div>
          </main>
      </div>
    );
  }

  if (!classDetail) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
     

          <main className="flex-1 lg:ml-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
                <h2 className="text-xl font-semibold text-gray-300 mb-2">Class Not Found</h2>
                <p className="text-gray-400 mb-4">
                  The class you're looking for doesn't exist or you don't have access to it.
                </p>
                <Button variant="primary" onClick={() => router.push('/dashboard/student/classes')}>
                  Back to Classes
                </Button>
              </div>
            </div>
          </main>
      </div>
    );
  }

  const teacherName = `${classDetail.teacher.first_name} ${classDetail.teacher.last_name}`.trim() || classDetail.teacher.email;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
        
        <main className="flex-1 lg:ml-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm">
              <ol className="flex items-center space-x-2 text-gray-400">
                <li>
                  <Link href="/dashboard/student" className="hover:text-primary-400 transition-colors">
                    Student Dashboard
                  </Link>
                </li>
                <li>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </li>
                <li>
                  <Link href="/dashboard/student/classes" className="hover:text-primary-400 transition-colors">
                    My Classes
                  </Link>
                </li>
                <li>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </li>
                <li className="text-white font-medium">{classDetail.name}</li>
              </ol>
            </nav>

            {/* Header Section */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">{classDetail.name}</h1>
                {classDetail.description && (
                  <p className="text-gray-400 text-lg">{classDetail.description}</p>
                )}
              </div>

              {/* Teacher Info Card */}
              <div className="bg-gray-800 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-900/30 rounded-full flex items-center justify-center text-primary-400 font-semibold text-lg">
                    {classDetail.teacher.first_name?.[0]?.toUpperCase() || classDetail.teacher.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Instructor</p>
                    <p className="text-white font-semibold text-lg">{teacherName}</p>
                    <p className="text-gray-400 text-sm">{classDetail.teacher.email}</p>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="p-3 bg-primary-900/30 rounded-lg mr-4">
                      <svg
                        className="w-6 h-6 text-primary-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Classmates</p>
                      <p className="text-2xl font-bold text-white">{classDetail.student_count}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-900/30 rounded-lg mr-4">
                      <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Quizzes</p>
                      <p className="text-2xl font-bold text-white">0</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="p-3 bg-green-900/30 rounded-lg mr-4">
                      <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Joined</p>
                      <p className="text-lg font-semibold text-white">
                        {new Date(classDetail.joined_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Assignments Section */}
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                  Assignments
                </h2>
                <div className="text-center py-8">
                  <p className="text-gray-500">No assignments yet</p>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Recent Activity
                </h2>
                <div className="text-center py-8">
                  <p className="text-gray-500">No recent activity</p>
                </div>
              </div>
            </div>
          </div>
        </main>
    </div>
  );
}

export default function StudentClassDetailPage() {
  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <StudentClassDetailContent />
    </ProtectedRoute>
  );
}
