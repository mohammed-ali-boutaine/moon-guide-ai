'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useNotification } from '@/contexts/notification-context';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

interface ClassItem {
  id: string;
  name: string;
  description: string | null;
  teacher_name: string;
  teacher_email: string;
  student_count: number;
  created_at: string;
}

export default function AdminClassesPage() {
  const { success, error: notifyError } = useNotification();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      const res = await fetch(`${API_URL}/api/admin/classes?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setClasses(data.items);
      setTotal(data.total);
    } catch {
      notifyError('Failed to load classes.');
    } finally {
      setLoading(false);
    }
  }, [API_URL, page, search]);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleDelete = async (classId: string, className: string) => {
    if (!confirm(`Delete class "${className}"? This cannot be undone.`)) return;
    setDeletingId(classId);
    try {
      const res = await fetch(`${API_URL}/api/admin/classes/${classId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error();
      success(`Class "${className}" deleted.`);
      loadClasses();
    } catch {
      notifyError('Failed to delete class.');
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-100">Classes</h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} total classes</p>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by name…"
              className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-white/20 w-52"
            />
            <button type="submit" className="px-3 py-1.5 text-xs bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors">
              Search
            </button>
            {search && (
              <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
                className="px-3 py-1.5 text-xs bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors">
                Clear
              </button>
            )}
          </form>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Class', 'Teacher', 'Students', 'Created', 'Action'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {classes.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">No classes found.</td></tr>
                ) : classes.map(c => (
                  <tr key={c.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-gray-200 font-medium">{c.name}</p>
                      {c.description && <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{c.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-300">{c.teacher_name || '—'}</p>
                      <p className="text-xs text-gray-500">{c.teacher_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-blue-900/30 text-blue-300 border border-blue-800/50 rounded-full text-xs">
                        {c.student_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        disabled={deletingId === c.id}
                        className="p-1.5 text-gray-500 hover:text-red-400 transition-colors disabled:opacity-40"
                        title="Delete class"
                      >
                        <TrashIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
                <span className="text-xs text-gray-500">{total} classes</span>
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
