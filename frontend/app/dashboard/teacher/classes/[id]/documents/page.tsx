'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DocumentUpload, DocumentList } from '@/components/documents';
import { Button, LoadingSpinner } from '@/components/ui';
import {
  useClassDocuments,
  useUploadClassDocument,
  useDeleteDocument,
} from '@/hooks/use-documents';
import { useClassDetail } from '@/hooks/use-classes';
import { useNotification } from '@/contexts/notification-context';
import type { UploadProgress } from '@/types';

export default function ClassDocumentsPage() {
  const params = useParams();
  const classId = params.id as string;
  const { success: showSuccess, error: showError } = useNotification();

  const [uploads, setUploads] = useState<UploadProgress[]>([]);

  // Fetch class details and documents
  const { data: classData, isLoading: isLoadingClass } = useClassDetail(classId);
  const { data: documentsData, isLoading: isLoadingDocs } = useClassDocuments(classId);

  // Mutations
  const { upload, isPending: isUploadPending } = useUploadClassDocument(classId);
  const deleteMutation = useDeleteDocument(classId);

  const handleUpload = useCallback(
    async (files: File[]) => {
      let baseIndex = 0;
      setUploads((prev) => {
        baseIndex = prev.length;
        const newUploads: UploadProgress[] = files.map((file) => ({
          fileName: file.name,
          fileSize: file.size,
          progress: 0,
          status: 'uploading',
        }));
        return [...prev, ...newUploads];
      });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadIndex = baseIndex + i;

        try {
          const data = await upload(file, (progress) => {
            setUploads((prev) =>
              prev.map((u, idx) => (idx === uploadIndex ? { ...u, progress } : u))
            );
          });
          setUploads((prev) =>
            prev.map((u, idx) =>
              idx === uploadIndex
                ? {
                    ...u,
                    status: data.status === 'processing' ? 'processing' : 'completed',
                    documentId: data.document_id,
                  }
                : u
            )
          );
          showSuccess(`"${file.name}" uploaded successfully`);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Upload failed';
          setUploads((prev) =>
            prev.map((u, idx) =>
              idx === uploadIndex ? { ...u, status: 'error', error: message } : u
            )
          );
          showError(`Failed to upload "${file.name}": ${message}`);
        }
      }
    },
    [upload, showError, showSuccess]
  );

  const handleDelete = useCallback(
    async (documentId: number) => {
      try {
        await deleteMutation.mutateAsync(documentId, {
          onSuccess: () => {
            showSuccess('Document deleted successfully');
          },
          onError: (error) => {
            showError(`Failed to delete document: ${error.message}`);
          },
        });
      } catch (error) {
        // Error handled in onError callback
      }
    },
    [deleteMutation, showError, showSuccess]
  );

  const isLoading = isLoadingClass || isLoadingDocs;

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={['TEACHER']}>
        <div className="bg-[#0a0a0f] min-h-screen">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['TEACHER']}>
      <div className="bg-[#0a0a0f] min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Link href="/dashboard/teacher/classes" className="hover:text-gray-300 transition-colors">
                Classes
              </Link>
              <span>/</span>
              <Link href={`/dashboard/teacher/classes/${classId}`} className="hover:text-gray-300 transition-colors">
                {classData?.name}
              </Link>
              <span>/</span>
              <span className="text-gray-400">Documents</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Class Documents</h1>
                <p className="text-gray-400 mt-1">
                  Manage learning materials for {classData?.name}
                </p>
              </div>
              <Button variant="ghost">
                <Link href={`/dashboard/teacher/classes/${classId}`} className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Class
                </Link>
              </Button>
            </div>
          </div>

          {/* Upload Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Upload Documents</h2>
            <DocumentUpload
              onUpload={handleUpload}
              uploads={uploads}
              disabled={isUploadPending}
            />
          </div>

          {/* Documents List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Documents ({documentsData?.total || 0})
              </h2>
            </div>
            <DocumentList
              documents={documentsData?.documents || []}
              onDelete={handleDelete}
              isDeleting={deleteMutation.isPending}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
