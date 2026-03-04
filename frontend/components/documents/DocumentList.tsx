'use client';

import { useState } from 'react';
import { Document, DocumentStatus } from '@/types';
import { ConfirmModal } from '@/components/ui';

interface DocumentListProps {
  documents: Document[];
  onDelete: (documentId: number) => void;
  isDeleting?: boolean;
}

const statusConfig: Record<DocumentStatus, { label: string; color: string; icon: string }> = {
  pending: {
    label: 'Pending Approval',
    color: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
    icon: '⏳',
  },
  approved: {
    label: 'Approved',
    color: 'bg-blue-900/30 text-blue-400 border-blue-800',
    icon: '✓',
  },
  processing: {
    label: 'Processing',
    color: 'bg-purple-900/30 text-purple-400 border-purple-800',
    icon: '⚙️',
  },
  ready: {
    label: 'Ready',
    color: 'bg-green-900/30 text-green-400 border-green-800',
    icon: '✓',
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-900/30 text-red-400 border-red-800',
    icon: '✕',
  },
};

const fileTypeIcons: Record<string, string> = {
  pdf: '📄',
  docx: '📝',
  txt: '📃',
  md: '📑',
};

export default function DocumentList({ documents, onDelete, isDeleting }: DocumentListProps) {
  const [deletingDoc, setDeletingDoc] = useState<Document | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  const handleDelete = () => {
    if (deletingDoc) {
      onDelete(deletingDoc.id);
      setDeletingDoc(null);
    }
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-300 mb-2">No documents yet</h3>
        <p className="text-gray-500">Upload your first document to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="divide-y divide-gray-800">
          {documents.map((doc) => {
            const status = statusConfig[doc.status];
            return (
              <div
                key={doc.id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-800/40 transition-colors"
              >
                {/* File Icon */}
                <div className="p-2.5 bg-gray-800 rounded-lg shrink-0">
                  <span className="text-xl">{fileTypeIcons[doc.file_type] || '📄'}</span>
                </div>

                {/* Document Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-100 truncate">{doc.filename}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">
                      {formatFileSize(doc.file_size_bytes)}
                    </span>
                    <span className="text-xs text-gray-600">•</span>
                    <span className="text-xs text-gray-500">
                      Uploaded {formatDate(doc.created_at)}
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <span
                  className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${status.color}`}
                >
                  <span>{status.icon}</span>
                  {status.label}
                </span>

                {/* Mobile Status (icon only) */}
                <span className={`sm:hidden px-2 py-1 rounded-full border ${status.color}`}>
                  <span className="text-xs">{status.icon}</span>
                </span>

                {/* Delete Button */}
                <button
                  onClick={() => setDeletingDoc(doc)}
                  disabled={isDeleting}
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete document"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingDoc}
        onClose={() => setDeletingDoc(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        message={`Are you sure you want to delete "${deletingDoc?.filename}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </>
  );
}
