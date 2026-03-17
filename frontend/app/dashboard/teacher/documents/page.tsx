'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useClassContext } from '@/contexts/class-context';

export default function TeacherDocumentsPage() {
  const { selectedClassId, classes, isLoading } = useClassContext();
  const router = useRouter();

  // If a class is selected, forward to its documents page
  useEffect(() => {
    if (selectedClassId) {
      router.replace(`/dashboard/teacher/classes/${selectedClassId}/documents`);
    }
  }, [selectedClassId, router]);

  // Still loading classes or already redirecting
  if (selectedClassId || isLoading) {
    return (
      <ProtectedRoute allowedRoles={['TEACHER']}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </ProtectedRoute>
    );
  }

  // No class selected — prompt the user
  return (
    <ProtectedRoute allowedRoles={['TEACHER']}>
      <div className="bg-[#0a0a0f] min-h-full flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>

          <h2 className="text-xl font-semibold text-gray-100 mb-2">Select a class first</h2>
          <p className="text-gray-400 text-sm mb-6">
            Documents are uploaded per class. Use the class selector in the top navigation bar to choose which class you want to manage documents for.
          </p>

          {classes.length === 0 ? (
            <p className="text-sm text-gray-500">
              You don&apos;t have any classes yet. Create one using the <span className="text-primary-400">+</span> button next to the class selector.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">Your classes</p>
              {classes.map((cls) => (
                <a
                  key={cls.id}
                  href={`/dashboard/teacher/classes/${cls.id}/documents`}
                  className="flex items-center justify-between px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 hover:bg-gray-800/60 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-100">{cls.name}</p>
                    <p className="text-xs text-gray-500">{cls.student_count} students</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
