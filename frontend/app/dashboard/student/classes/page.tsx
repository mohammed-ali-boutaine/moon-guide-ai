'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Sidebar, MobileSidebarToggle } from '@/components/layout';
import { LoadingSpinner } from '@/components/ui';
import { useStudentClasses } from '@/hooks/use-classes';
import type { StudentClass } from '@/types';

function StudentClassesContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');

  const { data: classesData, isLoading, error } = useStudentClasses(
    1,
    20,
    searchQuery || undefined,
    sortBy
  );

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

        {/* Main Content */}
        <main className="flex-1 lg:ml-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">My Classes</h1>
              <p className="text-gray-400">View all your enrolled classes and access course materials</p>
            </div>

            {/* Search and Filter */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search classes by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 pl-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <svg
                  className="absolute left-3 top-3.5 w-5 h-5 text-gray-500"
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

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="created_at">Sort by: Recently Added</option>
                <option value="name">Sort by: Name</option>
              </select>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 text-center">
                <h3 className="text-lg font-semibold text-red-400 mb-2">Error Loading Classes</h3>
                <p className="text-gray-300">
                  {error instanceof Error ? error.message : 'Failed to load classes'}
                </p>
              </div>
            )}

            {/* Classes Grid */}
            {!isLoading && !error && classesData && (
              <>
                {classesData.items.length === 0 ? (
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-800 rounded-full mb-4">
                      <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-300 mb-2">No Classes Found</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                      {searchQuery
                        ? 'No classes match your search criteria. Try adjusting your search terms.'
                        : "You haven't been enrolled in any classes yet. Your classes will appear here once your teacher adds you."}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 text-sm text-gray-400">
                      Showing {classesData.items.length} of {classesData.total} {classesData.total === 1 ? 'class' : 'classes'}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {classesData.items.map((classItem) => (
                        <ClassCard key={classItem.id} classItem={classItem} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

interface ClassCardProps {
  classItem: StudentClass;
}

function ClassCard({ classItem }: ClassCardProps) {
  const teacherName = `${classItem.teacher.first_name} ${classItem.teacher.last_name}`.trim() || classItem.teacher.email;

  return (
    <Link href={`/dashboard/student/classes/${classItem.id}`}>
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-primary-600 transition-all hover:shadow-lg hover:shadow-primary-900/20 cursor-pointer h-full flex flex-col">
        {/* Class Name */}
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-white mb-2 line-clamp-2">
            {classItem.name}
          </h3>
          {classItem.description && (
            <p className="text-gray-400 text-sm line-clamp-2">{classItem.description}</p>
          )}
        </div>

        {/* Teacher Info */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-800">
          <div className="w-10 h-10 bg-primary-900/30 rounded-full flex items-center justify-center text-primary-400 font-semibold">
            {classItem.teacher.first_name?.[0]?.toUpperCase() || classItem.teacher.email[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500">Teacher</p>
            <p className="text-white font-medium truncate">{teacherName}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-auto space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              <span>{classItem.student_count} {classItem.student_count === 1 ? 'student' : 'students'}</span>
            </div>
            <div className="px-3 py-1 bg-blue-900/30 text-blue-400 text-xs font-medium rounded-full border border-blue-800/50">
              0 quizzes
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>
              Joined {new Date(classItem.joined_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function StudentClassesPage() {
  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <StudentClassesContent />
    </ProtectedRoute>
  );
}
