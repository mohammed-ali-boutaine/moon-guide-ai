'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useClassContext } from '@/contexts/class-context';
import { useState, useEffect } from 'react';

interface SidebarItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

// ── Icons ──────────────────────────────────────────────────────────────────────

const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const DocumentsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const QuizzesIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const ChatIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const StudentsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const ClassesIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const CareerIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const StudyIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const FlashcardsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

// ── Static nav items for non-teacher roles ─────────────────────────────────────

const staticNavItems: Record<string, SidebarItem[]> = {
  STUDENT: [
    { href: '/dashboard/student', label: 'Dashboard', icon: <DashboardIcon /> },
    { href: '/dashboard/student/classes', label: 'My Classes', icon: <ClassesIcon /> },
    { href: '/dashboard/student/documents', label: 'Documents', icon: <DocumentsIcon /> },
    { href: '/dashboard/student/quizzes', label: 'Quizzes', icon: <QuizzesIcon /> },
    { href: '/dashboard/student/flashcards', label: 'Flashcards', icon: <FlashcardsIcon /> },
    { href: '/dashboard/student/career', label: 'Career', icon: <CareerIcon /> },
    { href: '/dashboard/student/study', label: 'Study', icon: <StudyIcon /> },
  ],
  ADMIN: [
    { href: '/dashboard/admin', label: 'Dashboard', icon: <DashboardIcon /> },
    { href: '/dashboard/admin/users', label: 'Users', icon: <UsersIcon /> },
    { href: '/dashboard/admin/classes', label: 'Classes', icon: <ClassesIcon /> },
    { href: '/dashboard/admin/documents', label: 'Documents', icon: <DocumentsIcon /> },
    { href: '/dashboard/admin/analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
    { href: '/dashboard/admin/settings', label: 'Settings', icon: <SettingsIcon /> },
  ],
};

// ── Sidebar component ─────────────────────────────────────────────────────────

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ isOpen = true, onClose, collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { selectedClassId, selectedClass } = useClassContext();
  const [isScrolled, setIsScrolled] = useState(false);

  const role = user?.role || 'STUDENT';

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Build teacher nav dynamically based on selected class
  const teacherNavItems: SidebarItem[] = [
    {
      href: '/dashboard/teacher',
      label: 'Dashboard',
      icon: <DashboardIcon />,
    },
    {
      href: selectedClassId
        ? `/dashboard/teacher/classes/${selectedClassId}/documents`
        : '/dashboard/teacher/documents',
      label: 'Documents',
      icon: <DocumentsIcon />,
    },
    {
      href: '/dashboard/teacher/quizzes',
      label: 'Quizzes',
      icon: <QuizzesIcon />,
    },
    {
      href: selectedClassId
        ? `/dashboard/teacher/classes/${selectedClassId}`
        : '/dashboard/teacher/students',
      label: 'Students',
      icon: <StudentsIcon />,
    },
    {
      href: '/dashboard/teacher/analytics',
      label: 'Analytics',
      icon: <AnalyticsIcon />,
    },
  ];

  const navItems = role === 'TEACHER' ? teacherNavItems : (staticNavItems[role] ?? staticNavItems.STUDENT);

  return (
    <>
      <aside
        className={cn(
          'sticky left-0 z-40 bg-gray-900 border-r border-gray-800 transition-all duration-300 ease-in-out flex flex-col',
          collapsed ? 'w-16' : 'w-48',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          isScrolled ? 'top-14 h-[calc(100vh-3.5rem)]' : 'top-16 h-[calc(100vh-4rem)]'
        )}
      >
        {/* Collapse toggle */}
        <div className="flex items-center justify-end p-3 border-b border-gray-800 h-14">
          {/* Selected class badge (when not collapsed) */}
          {!collapsed && selectedClass && role === 'TEACHER' && (
            <span className="flex-1 truncate text-xs text-primary-400 font-medium px-1" title={selectedClass.name}>
              {selectedClass.name}
            </span>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors shrink-0"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            <svg
              className={cn('w-5 h-5 transition-transform duration-300', collapsed && 'rotate-180')}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isExactMatch = pathname === item.href;
            const isParentMatch = pathname.startsWith(`${item.href}/`);
            const isActive = isExactMatch || (isParentMatch && !navItems.some(other =>
              other.href !== item.href &&
              (pathname === other.href || pathname.startsWith(`${other.href}/`)) &&
              other.href.length > item.href.length
            ));
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary-600/10 text-primary-400 border border-primary-600/20'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800',
                  collapsed && 'justify-center'
                )}
                title={collapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User info footer */}
        <div className={cn('border-t border-gray-800', collapsed ? 'p-2' : 'p-4')}>
          {!collapsed ? (
            <div className="flex items-center gap-3">
              {user?.profile?.avatar_url ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL}${user.profile.avatar_url}`}
                  alt="avatar"
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-gray-700"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 font-semibold text-xs flex-shrink-0">
                  {user?.profile?.first_name?.[0]}{user?.profile?.last_name?.[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">
                  {user?.profile?.first_name} {user?.profile?.last_name}
                </p>
                <p className="text-xs text-gray-500 truncate">{role.charAt(0) + role.slice(1).toLowerCase()} Portal</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              {user?.profile?.avatar_url ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL}${user.profile.avatar_url}`}
                  alt="avatar"
                  className="h-8 w-8 rounded-full object-cover"
                  title={`${user.profile.first_name} ${user.profile.last_name}`}
                />
              ) : (
                <div
                  className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 font-semibold text-xs"
                  title={`${user?.profile?.first_name} ${user?.profile?.last_name}`}
                >
                  {user?.profile?.first_name?.[0]}{user?.profile?.last_name?.[0]}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />
      )}
    </>
  );
}
