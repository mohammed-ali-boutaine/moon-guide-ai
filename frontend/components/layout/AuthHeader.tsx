'use client';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useClassContext } from '@/contexts/class-context';

// ── Create Class Modal ────────────────────────────────────────────────────────

function CreateClassModal({ onClose }: { onClose: () => void }) {
  const { createClass, isCreating } = useClassContext();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Class name is required.'); return; }
    try {
      await createClass({ name: name.trim(), description: description.trim() });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create class.');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-100">New Class</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Class name</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="e.g. Mathematics 101"
              className="w-full bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2.5 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Description <span className="text-gray-500 font-normal">(optional)</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this class"
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2.5 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !name.trim()}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isCreating ? 'Creating...' : 'Create Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── AuthHeader ────────────────────────────────────────────────────────────────

export default function AuthHeader() {
  const { user, logout } = useAuth();
  const { classes, selectedClassId, setSelectedClassId } = useClassContext();
  const isTeacher = user?.role === 'TEACHER';

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 border-b border-gray-800 bg-black/95 backdrop-blur-sm shadow-md transition-all duration-300 ${
        isScrolled ? 'h-14' : 'h-16'
      }`}>
        <div className="flex h-full items-center justify-between px-4 gap-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center space-x-2 shrink-0">
            <span className="text-xl font-bold text-white tracking-tight">
              Moon Guide <span className="text-gray-400">AI</span>
            </span>
          </Link>

          {/* Class selector — teacher only */}
          {isTeacher && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={selectedClassId ?? ''}
                  onChange={(e) => setSelectedClassId(e.target.value || null)}
                  className="appearance-none bg-gray-800/80 border border-gray-700 text-gray-100 text-sm rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 min-w-[160px] cursor-pointer"
                >
                  <option value="">All classes</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
                {/* chevron */}
                <svg
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Create class button */}
              <button
                onClick={() => setShowCreateModal(true)}
                title="New class"
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-600/20 border border-primary-600/40 text-primary-400 hover:bg-primary-600/30 hover:border-primary-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          )}

          {/* Profile Dropdown */}
          <div className="relative ml-auto" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center space-x-2 text-sm font-medium text-gray-300 hover:text-white transition-colors focus:outline-none"
            >
              <div className={`rounded-full bg-white flex items-center justify-center text-black font-semibold text-xs select-none transition-all duration-300 ${
                isScrolled ? 'h-7 w-7' : 'h-8 w-8'
              }`}>
                {user?.profile?.first_name?.[0]}{user?.profile?.last_name?.[0]}
              </div>
              <span className="hidden sm:block">{user?.profile?.first_name}</span>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-700 bg-gray-900 shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-700">
                  <p className="text-sm font-semibold text-white truncate">
                    {user?.profile?.first_name} {user?.profile?.last_name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
                <div className="py-1">
                  <Link
                    href="/me"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A9 9 0 1118.88 6.196M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>
                </div>
                <div className="border-t border-gray-700 py-1">
                  <button
                    onClick={() => { setDropdownOpen(false); logout(); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {showCreateModal && <CreateClassModal onClose={() => setShowCreateModal(false)} />}
    </>
  );
}
