'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePersonalDocuments } from '@/hooks/use-documents';
import { ProtectedRoute } from '@/components/auth';
import { LoadingSpinner } from '@/components/ui';
import ChatWindow from '@/components/chat/ChatWindow';
import type { Document } from '@/types';

function PersonalChatContent() {
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const { data: docsData, isLoading } = usePersonalDocuments();

  const readyDocs = docsData?.documents.filter((d) => d.status === 'ready') ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#0a0a0f]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Breadcrumb bar */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-800 bg-gray-900/50 flex-shrink-0">
        <nav className="text-sm">
          <ol className="flex items-center flex-wrap gap-1 text-gray-400">
            <li>
              <Link href="/dashboard/student" className="hover:text-primary-400 transition-colors">
                Dashboard
              </Link>
            </li>
            <li>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </li>
            <li>
              <Link href="/dashboard/student/documents" className="hover:text-primary-400 transition-colors">
                My Documents
              </Link>
            </li>
            <li>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </li>
            <li className="text-white font-medium">AI Chat</li>
          </ol>
        </nav>
      </div>

      <div className="flex flex-1 min-h-0 p-4 sm:p-6 lg:p-8 gap-4 max-w-7xl mx-auto w-full"
        style={{ minHeight: 'calc(100vh - 130px)' }}>

        {/* Document picker panel */}
        <div className="w-64 flex-shrink-0 flex flex-col bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-white font-medium text-sm">My Documents</h3>
            <p className="text-gray-500 text-xs mt-0.5">Select a document to chat about</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {/* "All documents" option */}
            <button
              onClick={() => setSelectedDoc(null)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                !selectedDoc
                  ? 'bg-primary-900/40 border border-primary-700/50 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <span className="truncate text-xs">All documents</span>
              </div>
            </button>

            {readyDocs.length === 0 && (
              <p className="text-gray-600 text-xs text-center py-4 px-2">
                No ready documents. Upload and process a document first.
              </p>
            )}

            {readyDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  selectedDoc?.id === doc.id
                    ? 'bg-primary-900/40 border border-primary-700/50 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="truncate text-xs">{doc.filename}</span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5 pl-6 uppercase">{doc.file_type}</p>
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-gray-800">
            <Link
              href="/dashboard/student/documents"
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-primary-400 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Upload new document
            </Link>
          </div>
        </div>

        {/* Chat panel */}
        <div className="flex-1 min-w-0">
          <ChatWindow
            documentId={selectedDoc ? selectedDoc.id : undefined}
            title={selectedDoc ? `Chat: ${selectedDoc.filename}` : 'Chat: All my documents'}
          />
        </div>
      </div>
    </div>
  );
}

export default function PersonalDocumentChatPage() {
  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <PersonalChatContent />
    </ProtectedRoute>
  );
}
