'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useNotification } from '@/contexts/notification-context';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

interface UserItem {
  id: string;
  email: string;
  role: string | null;
  is_active: boolean;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
}

type RoleFilter = 'ALL' | 'STUDENT' | 'TEACHER' | 'ADMIN';

export default function AdminUsersPage() {
  const { success, error: notifyError } = useNotification();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [creating, setCreating] = useState(false);
  const [adminForm, setAdminForm] = useState({ email: '', password: '', first_name: '', last_name: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
      if (roleFilter !== 'ALL') params.set('role', roleFilter);
      const res = await fetch(`${API_URL}/api/admin/users?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data.items);
      setTotal(data.total);
    } catch {
      notifyError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [API_URL, page, roleFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleExport = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/export`, { credentials: 'include' });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'users_export.csv';
      a.click();
      URL.revokeObjectURL(url);
      success('Export downloaded.');
    } catch {
      notifyError('Failed to export.');
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!adminForm.email.trim()) errors.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminForm.email)) errors.email = 'Invalid email';
    if (!adminForm.password.trim()) errors.password = 'Required';
    else if (adminForm.password.length < 8) errors.password = 'Min 8 characters';
    if (!adminForm.first_name.trim()) errors.first_name = 'Required';
    if (!adminForm.last_name.trim()) errors.last_name = 'Required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateAdmin = async () => {
    if (!validateForm()) return;
    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/admin`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed');
      }
      success('Admin created.');
      setShowCreateAdmin(false);
      setAdminForm({ email: '', password: '', first_name: '', last_name: '' });
      loadUsers();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Failed to create admin.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (userId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/toggle-active`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: data.is_active } : u));
      success(`User ${data.is_active ? 'activated' : 'deactivated'}.`);
    } catch {
      notifyError('Failed to toggle user status.');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-100">Users</h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} total users</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors">
              <DownloadIcon />Export CSV
            </button>
            <button onClick={() => setShowCreateAdmin(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white text-gray-900 rounded-lg hover:bg-gray-100 font-medium transition-colors">
              <PlusIcon />Create Admin
            </button>
          </div>
        </div>

        {/* Role filter */}
        <div className="flex gap-2 mb-4">
          {(['ALL', 'STUDENT', 'TEACHER', 'ADMIN'] as RoleFilter[]).map(r => (
            <button key={r} onClick={() => { setRoleFilter(r); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${roleFilter === r ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}>
              {r}
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
                  {['Name', 'Email', 'Role', 'Status', 'Joined', 'Action'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">No users found.</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 text-gray-200">{[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'ADMIN' ? 'bg-purple-900/40 text-purple-300 border border-purple-800' : u.role === 'TEACHER' ? 'bg-yellow-900/40 text-yellow-300 border border-yellow-800' : 'bg-blue-900/40 text-blue-300 border border-blue-800'}`}>
                        {u.role ?? ''}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-900/40 text-green-300 border border-green-800' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggleActive(u.id)} className="text-xs text-gray-400 hover:text-gray-200 underline transition-colors">
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
                <span className="text-xs text-gray-500">{total} users</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-xs bg-gray-800 text-gray-300 rounded disabled:opacity-40">Prev</button>
                  <span className="px-3 py-1 text-xs text-gray-400">{page} / {totalPages}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-xs bg-gray-800 text-gray-300 rounded disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        )}

        {showCreateAdmin && (
          <Modal isOpen={showCreateAdmin} onClose={() => setShowCreateAdmin(false)} title="Create Admin User">
            <div className="space-y-4">
              {(['email', 'password', 'first_name', 'last_name'] as const).map(field => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-400 mb-1 capitalize">
                    {field.replace('_', ' ')}
                    {formErrors[field] && <span className="text-red-400 ml-2">({formErrors[field]})</span>}
                  </label>
                  <input
                    type={field === 'password' ? 'password' : 'text'}
                    value={adminForm[field]}
                    onChange={e => {
                      setAdminForm(f => ({ ...f, [field]: e.target.value }));
                      if (formErrors[field]) setFormErrors(p => ({ ...p, [field]: '' }));
                    }}
                    className={`w-full px-3 py-2 bg-gray-800 border text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-white/20 ${formErrors[field] ? 'border-red-500' : 'border-gray-700'}`}
                  />
                </div>
              ))}
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setShowCreateAdmin(false)} className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700">Cancel</button>
                <button onClick={handleCreateAdmin} disabled={creating} className="px-4 py-2 text-sm bg-white text-gray-900 rounded-lg hover:bg-gray-100 font-medium disabled:opacity-50">
                  {creating ? 'Creating…' : 'Create Admin'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </ProtectedRoute>
  );
}
