'use client';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const getDashboardLink = () => {
    if (!user?.role) return '/';
    switch (user.role) {
      case 'ADMIN': return '/dashboard/admin';
      case 'TEACHER': return '/dashboard/teacher';
      case 'STUDENT': return '/dashboard/student';
      default: return '/';
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { href: getDashboardLink(), label: 'Dashboard' },
    { href: '/documents', label: 'Documents' },
    { href: '/quiz', label: 'Quiz' },
    { href: '/career', label: 'Career' },
  ];

  return (
    <header className="border-b border-gray-800 bg-black shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">

        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold text-white tracking-tight">
            Moon Guide <span className="text-gray-400">AI</span>
          </span>
        </Link>

        {/* Nav Links */}
        <nav className="flex items-center space-x-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm font-medium text-gray-400 px-4 py-2 rounded-md transition-colors hover:text-white hover:bg-white/10"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Auth Section */}
        <div className="flex items-center space-x-3">
          {isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              {/* Profile Button */}
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center space-x-2 text-sm font-medium text-gray-300 hover:text-white transition-colors focus:outline-none"
              >
                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-black font-semibold text-xs select-none">
                  {user?.profile?.first_name?.[0]}{user?.profile?.last_name?.[0]}
                </div>
                <span>{user?.profile?.first_name}</span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-700 bg-gray-900 shadow-xl z-50 overflow-hidden">
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-gray-700">
                    <p className="text-sm font-semibold text-white truncate">
                      {user?.profile?.first_name} {user?.profile?.last_name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  </div>

                  {/* Menu Items */}
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

                  {/* Logout */}
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
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-400 hover:text-white px-4 py-2 rounded-md transition-colors hover:bg-white/10"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium text-black bg-white px-4 py-2 rounded-md transition-all hover:bg-gray-200 shadow-sm"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}