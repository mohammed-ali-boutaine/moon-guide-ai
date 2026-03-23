'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DocumentUpload, DocumentList } from '@/components/documents';
import { Button, LoadingSpinner } from '@/components/ui';
import {
  usePersonalDocuments,
  useUploadPersonalDocument,
  useDeleteDocument,
} from '@/hooks/use-documents';
import { useNotification } from '@/contexts/notification-context';
import type { UploadProgress } from '@/types';

export default function StudentDocumentsPage() {
  const { success: showSuccess, error: showError } = useNotification();
  const [uploads, setUploads] = useState<UploadProgress[]>([]);

  // Fetch personal documents
  const { data: documentsData, isLoading: isLoadingDocs } = usePersonalDocuments();

  // Mutations
  const uploadMutation = useUploadPersonalDocument();
  const deleteMutation = useDeleteDocument();

  const handleUpload = useCallback(
    async (files: File[]) => {
      // Initialize upload progress for each file
      const newUploads: UploadProgress[] = files.map((file) => ({
        file,
        progress: 0,
        status: 'uploading',
      }));

      setUploads((prev) => [...prev, ...newUploads]);

      // Upload each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadIndex = uploads.length + i;

        try {
          await uploadMutation.mutateAsync(
            {
              file,
              onProgress: (progress) => {
                setUploads((prev) =>
                  prev.map((u, idx) =>
                    idx === uploadIndex ? { ...u, progress } : u
                  )
                );
              },
            },
            {
              onSuccess: (data) => {
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
              },
              onError: (error) => {
                setUploads((prev) =>
                  prev.map((u, idx) =>
                    idx === uploadIndex
                      ? { ...u, status: 'error', error: error.message }
                      : u
                  )
                );
                showError(`Failed to upload "${file.name}": ${error.message}`);
              },
            }
          );
        } catch (error) {
          // Error handled in onError callback
        }
      }
    },
    [uploadMutation, showError, showSuccess, uploads.length]
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

  if (isLoadingDocs) {
    return (
      <ProtectedRoute allowedRoles={['STUDENT']}>
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
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <div className="bg-[#0a0a0f] min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Link href="/dashboard/student" className="hover:text-gray-300 transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-gray-400">My Documents</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">My Documents</h1>
                <p className="text-gray-400 mt-1">
                  Upload and manage your personal learning materials
                </p>
              </div>
              <Button variant="ghost">
                <Link href="/dashboard/student" className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Dashboard
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
              disabled={uploadMutation.isPending}
            />
          </div>

          {/* Documents List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                My Documents ({documentsData?.total || 0})
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
