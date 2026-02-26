'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import Link from 'next/link';

const mockDocuments = [
  { id: '1', name: 'Introduction to Algebra.pdf', class: 'Mathematics 101', size: '2.4 MB', uploadedAt: '2026-02-20', type: 'pdf' },
  { id: '2', name: 'Chapter 3 - Geometry Notes.docx', class: 'Mathematics 101', size: '1.1 MB', uploadedAt: '2026-02-18', type: 'docx' },
  { id: '3', name: 'Physics Lab Manual.pdf', class: 'Physics Advanced', size: '5.7 MB', uploadedAt: '2026-02-15', type: 'pdf' },
  { id: '4', name: 'Essay Writing Guide.pdf', class: 'English Literature', size: '0.8 MB', uploadedAt: '2026-02-10', type: 'pdf' },
  { id: '5', name: 'Biology Cell Structure Slides.pptx', class: 'Biology Basic', size: '3.2 MB', uploadedAt: '2026-02-05', type: 'pptx' },
];

const typeColors: Record<string, string> = {
  pdf: 'bg-red-900/40 text-red-300 border-red-800',
  docx: 'bg-blue-900/40 text-blue-300 border-blue-800',
  pptx: 'bg-orange-900/40 text-orange-300 border-orange-800',
};

export default function TeacherDocumentsPage() {
  return (
    <ProtectedRoute allowedRoles={['TEACHER']}>
      <div className="bg-[#0a0a0f] min-h-full">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Documents</h1>
              <p className="text-gray-400 mt-1">Upload and manage learning materials for your classes.</p>
            </div>
            <button
              disabled
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg opacity-60 cursor-not-allowed"
              title="Coming soon"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Upload Document
            </button>
          </div>

          {/* Coming soon banner */}
          <div className="mb-6 px-4 py-3 bg-yellow-950/50 border border-yellow-800/50 text-yellow-300 rounded-xl text-sm flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Document management is under development. The data below is for preview only.
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Total Documents', value: '5', icon: '📄' },
              { label: 'Total Size', value: '13.2 MB', icon: '💾' },
              { label: 'Classes Covered', value: '4', icon: '📚' },
            ].map((s) => (
              <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{s.icon}</span>
                  <div>
                    <p className="text-2xl font-bold text-gray-100">{s.value}</p>
                    <p className="text-sm text-gray-400">{s.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Documents table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="text-base font-semibold text-gray-100">All Documents</h2>
            </div>
            <div className="divide-y divide-gray-800">
              {mockDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-800/40 transition-colors">
                  <div className="p-2.5 bg-gray-800 rounded-lg shrink-0">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-100 truncate">{doc.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{doc.class} · {doc.size}</p>
                  </div>
                  <span className={`hidden sm:inline-flex px-2 py-0.5 text-xs font-medium rounded border ${typeColors[doc.type] || 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                    {doc.type.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500 shrink-0">
                    {new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <button disabled className="p-1.5 text-gray-600 cursor-not-allowed" title="Download (coming soon)">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link href="/dashboard/teacher" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
