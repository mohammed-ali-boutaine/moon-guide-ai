'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/contexts/auth-context';
import { useNotification } from '@/contexts/notification-context';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

//  SVG Icons 
const UsersIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const BarChartIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M9 17V9m4 8v-5m4 5V5" />
  </svg>
);
const DownloadIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);
const PlusIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);
const BookIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);
const ShieldIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
// 

interface UserItem {
  id: string;
  email: string;
  role: string | null;
  is_active: boolean;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
}

interface Stats {
  total_users: number;
  students: number;
  teachers: number;
  admins: number;
  total_classes: number;
  active_sessions: number;
}

type RoleFilter = 'ALL' | 'STUDENT' | 'TEACHER' | 'ADMIN';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { success, error: notifyError } = useNotification();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const [tab, setTab] = useState<'stats' | 'users'>('stats');
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 15;

  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [creating, setCreating] = useState(false);
  const [adminForm, setAdminForm] = useState({ email: '', password: '', first_name: '', last_name: '' });

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/stats`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load stats');
      setStats(await res.json());
    } catch {
      notifyError('Failed to load statistics.');
    } finally {
      setStatsLoading(false);
    }
  }, [API_URL]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
      if (roleFilter !== 'ALL') params.set('role', roleFilter);
      const res = await fetch(`${API_URL}/api/admin/users?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setUsers(data.items);
      setTotal(data.total);
    } catch {
      notifyError('Failed to load users.');
    } finally {
      setUsersLoading(false);
    }
  }, [API_URL, page, roleFilter]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (tab === 'users') loadUsers(); }, [tab, loadUsers]);

  const handleExport = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/export`, { credentials: 'include' });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_export.csv`;
      a.click();
      URL.revokeObjectURL(url);
      success('Export downloaded.');
    } catch {
      notifyError('Failed to export data.');
    }
  };

  const handleCreateAdmin = async () => {
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
        throw new Error(err.detail || 'Failed to create admin');
      }
      success('Admin user created successfully.');
      setShowCreateAdmin(false);
      setAdminForm({ email: '', password: '', first_name: '', last_name: '' });
      loadUsers();
      loadStats();
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
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active: data.is_active } : u));
      success(`User ${data.is_active ? 'activated' : 'deactivated'}.`);
    } catch {
      notifyError('Failed to toggle user status.');
    }
  };

  const statCards = stats ? [
    { label: 'Total Users', value: stats.total_users, Icon: UsersIcon, color: 'blue' },
    { label: 'Students', value: stats.students, Icon: UsersIcon, color: 'green' },
    { label: 'Teachers', value: stats.teachers, Icon: UsersIcon, color: 'yellow' },
    { label: 'Classes', value: stats.total_classes, Icon: BookIcon, color: 'purple' },
    { label: 'Admins', value: stats.admins, Icon: ShieldIcon, color: 'red' },
    { label: 'Active Sessions', value: stats.active_sessions, Icon: BarChartIcon, color: 'gray' },
  ] : [];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-950/50 border-blue-900/50 text-blue-400',
    green: 'bg-green-950/50 border-green-900/50 text-green-400',
    yellow: 'bg-yellow-950/50 border-yellow-900/50 text-yellow-400',
    purple: 'bg-purple-950/50 border-purple-900/50 text-purple-400',
    red: 'bg-red-950/50 border-red-900/50 text-red-400',
    gray: 'bg-gray-800/50 border-gray-700/50 text-gray-400',
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="min-h-screen bg-[#0a0a0f]">
        {/* Header */}
        <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-100">Admin Dashboard</h1>
              <span className="px-2 py-0.5 text-xs bg-purple-900/50 text-purple-300 rounded-full border border-purple-800">Administrator</span>
            </div>
            <span className="text-sm text-gray-400">{user?.profile?.first_name} {user?.profile?.last_name}</span>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b border-gray-800">
            {([['stats', 'Statistics'], ['users', 'Users']] as [typeof tab, string][]).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${tab === id ? 'border-white text-white' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>{label}</button>
            ))}
          </div>

          {/* Stats tab */}
          {tab === 'stats' && (
            <div>
              {statsLoading ? (
                <div className="flex justify-center py-16"><LoadingSpinner /></div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {statCards.map(({ label, value, Icon, color }) => (
                    <div key={label} className={`bg-gray-900 border border-gray-800 rounded-2xl p-6 flex items-center gap-4`}>
                      <div className={`p-3 rounded-xl border ${colorMap[color]}`}><Icon className="w-5 h-5" /></div>
                      <div>
                        <p className="text-2xl font-bold text-gray-100">{value.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-6 flex justify-end">
                <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors">
                  <DownloadIcon />Export users CSV
                </button>
              </div>
            </div>
          )}

          {/* Users tab */}
          {tab === 'users' && (
            <div>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                {/* Role filter */}
                <div className="flex gap-2">
                  {(['ALL', 'STUDENT', 'TEACHER', 'ADMIN'] as RoleFilter[]).map((r) => (
                    <button key={r} onClick={() => { setRoleFilter(r); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${roleFilter === r ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}>{r}</button>
                  ))}
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

              {usersLoading ? (
                <div className="flex justify-center py-16"><LoadingSpinner /></div>
              ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        {['Name', 'Email', 'Role', 'Status', 'Joined', 'Action'].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-3 text-gray-200">{[u.first_name, u.last_name].filter(Boolean).join(' ') || ''}</td>
                          <td className="px-4 py-3 text-gray-400">{u.email}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'ADMIN' ? 'bg-purple-900/40 text-purple-300 border border-purple-800' : u.role === 'TEACHER' ? 'bg-yellow-900/40 text-yellow-300 border border-yellow-800' : 'bg-blue-900/40 text-blue-300 border border-blue-800'}`}>{u.role ?? ''}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-900/40 text-green-300 border border-green-800' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>{u.is_active ? 'Active' : 'Inactive'}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => handleToggleActive(u.id)} className="text-xs text-gray-400 hover:text-gray-200 transition-colors underline">
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {total > PAGE_SIZE && (
                    <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
                      <span className="text-xs text-gray-500">{total} users total</span>
                      <div className="flex gap-2">
                        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 text-xs bg-gray-800 text-gray-300 rounded disabled:opacity-40">Prev</button>
                        <span className="px-3 py-1 text-xs text-gray-400">{page} / {totalPages}</span>
                        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 text-xs bg-gray-800 text-gray-300 rounded disabled:opacity-40">Next</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create Admin Modal */}
        {showCreateAdmin && (
          <Modal isOpen={showCreateAdmin} onClose={() => setShowCreateAdmin(false)} title="Create Admin User">
            <div className="space-y-4">
              {(['email', 'password', 'first_name', 'last_name'] as const).map((field) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-400 mb-1 capitalize">{field.replace('_', ' ')}</label>
                  <input type={field === 'password' ? 'password' : 'text'} value={adminForm[field]}
                    onChange={(e) => setAdminForm((f) => ({ ...f, [field]: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-white/20" />
                </div>
              ))}
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setShowCreateAdmin(false)} className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700">Cancel</button>
                <button onClick={handleCreateAdmin} disabled={creating} className="px-4 py-2 text-sm bg-white text-gray-900 rounded-lg hover:bg-gray-100 font-medium disabled:opacity-50">
                  {creating ? 'Creating' : 'Create Admin'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </ProtectedRoute>
  );
}