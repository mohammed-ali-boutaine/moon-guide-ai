'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Sidebar, MobileSidebarToggle } from '@/components/layout';
import ClassCard from '@/components/classes/ClassCard';
import ClassForm from '@/components/classes/ClassForm';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui';
import { useClasses, useCreateClass, useUpdateClass, useDeleteClass } from '@/hooks/use-classes';

interface Class {
  id: string;
  name: string;
  description: string;
  student_count: number;
  created_at: string;
}

export default function TeacherClassesPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: classesData, isLoading, error } = useClasses(1, 10, searchQuery || undefined);
  const createClassMutation = useCreateClass();
  const updateClassMutation = useUpdateClass();
  const deleteClassMutation = useDeleteClass();

  const handleCreateClass = async (data: { name: string; description: string }) => {
    try {
      await createClassMutation.mutateAsync(data);
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error('Failed to create class:', err);
    }
  };

  const handleUpdateClass = async (data: { name: string; description: string }) => {
    if (!editingClass) return;
    try {
      await updateClassMutation.mutateAsync({ id: editingClass.id, data });
      setEditingClass(null);
    } catch (err) {
      console.error('Failed to update class:', err);
    }
  };

  const handleDeleteClass = async () => {
    if (!deletingClassId) return;
    try {
      await deleteClassMutation.mutateAsync(deletingClassId);
      setDeletingClassId(null);
    } catch (err) {
      console.error('Failed to delete class:', err);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['TEACHER']}>
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
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-white">My Classes</h1>
                  <p className="text-gray-400 mt-1">Manage your classes and students</p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Create Class
                </Button>
              </div>

              {/* Search */}
              <div className="mb-6">
                <div className="relative max-w-md">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search classes..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Content */}
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <LoadingSpinner size="lg" />
                </div>
              ) : error ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-900/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">Failed to load classes</h3>
                  <p className="text-gray-400 mb-4">{(error as Error).message}</p>
                  <Button onClick={() => window.location.reload()}>Try Again</Button>
                </div>
              ) : classesData?.items.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No classes yet</h3>
                  <p className="text-gray-400 mb-6">Get started by creating your first class</p>
                  <Button onClick={() => setIsCreateModalOpen(true)}>Create Class</Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classesData?.items.map((cls) => (
                      <ClassCard
                        key={cls.id}
                        classData={cls}
                        onEdit={setEditingClass}
                        onDelete={setDeletingClassId}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {classesData && classesData.total_pages > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={classesData.page === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-400">
                        Page {classesData.page} of {classesData.total_pages}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={classesData.page === classesData.total_pages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>

        {/* Create Class Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create New Class"
        >
          <ClassForm
            onSubmit={handleCreateClass}
            onCancel={() => setIsCreateModalOpen(false)}
            isSubmitting={createClassMutation.isPending}
            submitLabel="Create Class"
          />
        </Modal>

        {/* Edit Class Modal */}
        <Modal
          isOpen={!!editingClass}
          onClose={() => setEditingClass(null)}
          title="Edit Class"
        >
          {editingClass && (
            <ClassForm
              initialData={editingClass}
              onSubmit={handleUpdateClass}
              onCancel={() => setEditingClass(null)}
              isSubmitting={updateClassMutation.isPending}
              submitLabel="Save Changes"
            />
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={!!deletingClassId}
          onClose={() => setDeletingClassId(null)}
          title="Delete Class"
          size="sm"
        >
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-900/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Are you sure?</h3>
            <p className="text-gray-400 mb-6">
              This action cannot be undone. All students and data associated with this class will be permanently removed.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="ghost"
                onClick={() => setDeletingClassId(null)}
                disabled={deleteClassMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteClass}
                isLoading={deleteClassMutation.isPending}
              >
                Delete Class
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}
