'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useNotification } from '@/contexts/notification-context';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface DocumentItem {
  id: number;
  filename: string;
  file_type: string | null;
  status: string | null;
  scope: string | null;
  class_id: string | null;
  uploaded_by_role: string | null;
  uploader_email: string | null;
  file_size_bytes: number | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-900/40 text-yellow-300 border border-yellow-800',
  approved: 'bg-blue-900/40 text-blue-300 border border-blue-800',
  processing: 'bg-purple-900/40 text-purple-300 border border-purple-800',
  ready: 'bg-green-900/40 text-green-300 border border-green-800',
  rejected: 'bg-red-900/40 text-red-300 border border-red-800',
};

const ALL_STATUSES = ['pending', 'approved', 'processing', 'ready', 'rejected'];

function formatBytes(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminDocumentsPage() {
  const { error: notifyError } = useNotification();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${API_URL}/api/admin/documents?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDocs(data.items);
      setTotal(data.total);
    } catch {
      notifyError('Failed to load documents.');
    } finally {
      setLoading(false);
    }
  }, [API_URL, page, statusFilter]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-100">Documents</h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} total documents</p>
          </div>
        </div>

        {/* Status filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => { setStatusFilter(''); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!statusFilter ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
          >
            ALL
          </button>
          {ALL_STATUSES.map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${statusFilter === s ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}>
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Filename', 'Status', 'Uploader', 'Scope', 'Size', 'Uploaded'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {docs.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">No documents found.</td></tr>
                ) : docs.map(d => (
                  <tr key={d.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-gray-200 font-medium truncate max-w-xs">{d.filename}</p>
                      {d.file_type && <span className="text-xs text-gray-500 uppercase">{d.file_type}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {d.status && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[d.status] ?? 'bg-gray-800 text-gray-400'}`}>
                          {d.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-400 text-xs">{d.uploader_email ?? '—'}</p>
                      {d.uploaded_by_role && <p className="text-xs text-gray-600 capitalize">{d.uploaded_by_role}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs capitalize">{d.scope ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatBytes(d.file_size_bytes)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(d.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
                <span className="text-xs text-gray-500">{total} documents</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-xs bg-gray-800 text-gray-300 rounded disabled:opacity-40">Prev</button>
                  <span className="px-3 py-1 text-xs text-gray-400">{page} / {totalPages}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-xs bg-gray-800 text-gray-300 rounded disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
