'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useClassDetail, useRemoveStudent } from '@/hooks/use-classes';
import { StudentTable, AddStudentModal } from '@/components/classes';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { ProtectedRoute } from '@/components/auth';
import { Sidebar, MobileSidebarToggle } from '@/components/layout';

function ClassDetailContent() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: classDetail, isLoading, error } = useClassDetail(classId, searchQuery || undefined);
  const { mutate: removeStudent } = useRemoveStudent(classId);

  const handleRemoveStudent = (studentId: string) => {
    removeStudent(studentId);
  };

  const handleEditClass = () => {
    // Navigate to edit page or open edit modal
    // For now, we'll just show an alert
    alert('Edit functionality will be implemented');
  };

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
        <div className="flex">
          {/* Mobile Sidebar Toggle */}
          <MobileSidebarToggle
            isOpen={isSidebarOpen}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          />

          {/* Sidebar */}
          <Sidebar 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)} 
            collapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />

          <main className="flex-1 lg:ml-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Class</h2>
                <p className="text-gray-300">
                  {error instanceof Error ? error.message : 'Failed to load class details'}
                </p>
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/teacher/classes')}
                  className="mt-4"
                >
                  Back to Classes
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!classDetail) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <div className="flex">
          {/* Mobile Sidebar Toggle */}
          <MobileSidebarToggle
            isOpen={isSidebarOpen}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          />

          {/* Sidebar */}
          <Sidebar 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)} 
            collapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />

          <main className="flex-1 lg:ml-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
                <h2 className="text-xl font-semibold text-gray-300 mb-2">Class Not Found</h2>
                <p className="text-gray-400 mb-4">The class you're looking for doesn't exist or you don't have access to it.</p>
                <Button
                  variant="primary"
                  onClick={() => router.push('/dashboard/teacher/classes')}
                >
                  Back to Classes
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="flex">
        {/* Mobile Sidebar Toggle */}
        <MobileSidebarToggle
          isOpen={isSidebarOpen}
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {/* Sidebar */}
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          collapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        <main className="flex-1 lg:ml-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{/* Breadcrumb */}
        <nav className="mb-6 text-sm">
          <ol className="flex items-center space-x-2 text-gray-400">
            <li>
              <Link href="/dashboard/teacher" className="hover:text-primary-400 transition-colors">
                Teacher Dashboard
              </Link>
            </li>
            <li>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </li>
            <li>
              <Link href="/dashboard/teacher/classes" className="hover:text-primary-400 transition-colors">
                Classes
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
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{classDetail.name}</h1>
              {classDetail.description && (
                <p className="text-gray-400 text-lg">{classDetail.description}</p>
              )}
            </div>
            <Button variant="outline" onClick={handleEditClass}>
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit Class
            </Button>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center">
                <div className="p-3 bg-primary-900/30 rounded-lg mr-4">
                  <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Students</p>
                  <p className="text-2xl font-bold text-white">{classDetail.student_count}</p>
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
                  <p className="text-gray-400 text-sm">Created</p>
                  <p className="text-lg font-semibold text-white">
                    {new Date(classDetail.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
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
                  <p className="text-gray-400 text-sm">Assignments</p>
                  <p className="text-2xl font-bold text-white">0</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Students Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Students</h2>
              <p className="text-gray-400 text-sm mt-1">
                {classDetail.student_count} {classDetail.student_count === 1 ? 'student' : 'students'} enrolled
              </p>
            </div>
            <Button variant="primary" onClick={() => setIsAddStudentModalOpen(true)}>
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Add Students
            </Button>
          </div>

          {/* Search Input */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search students by email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 pl-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-2.5 w-5 h-5 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          <StudentTable
            students={classDetail.students}
            onRemove={handleRemoveStudent}
            isLoading={false}
          />
        </div>
          </div>
        </main>
      </div>

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        classId={classId}
        onSuccess={() => {
          // Optional: Show success toast or notification
        }}
      />
    </div>
  );
}

export default function ClassDetailPage() {
  return (
    <ProtectedRoute allowedRoles={['TEACHER']}>
      <ClassDetailContent />
    </ProtectedRoute>
  );
}
