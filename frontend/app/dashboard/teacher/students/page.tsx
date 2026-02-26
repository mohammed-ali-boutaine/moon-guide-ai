'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import Link from 'next/link';

interface Student {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  joined_at: string;
  class_id: string;
  class_name: string;
}

interface Class {
  id: string;
  name: string;
  student_count: number;
}

interface ClassStudent {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  joined_at: string;
}

function getInitials(firstName: string, lastName: string, email: string) {
  if (firstName || lastName) {
    return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
  }
  return email?.[0]?.toUpperCase() ?? '?';
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function TeacherStudentsPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/classes?page_size=100`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setClasses(data.items || []);
        }
      } catch (err) {
        console.error('Failed to fetch classes', err);
      } finally {
        setIsLoadingClasses(false);
      }
    };
    fetchClasses();
  }, []);

  // Fetch students based on selected class
  const fetchStudents = useCallback(async () => {
    setIsLoadingStudents(true);
    try {
      const token = localStorage.getItem('access_token');

      if (selectedClassId === 'all') {
        // Use recent-joins with a high limit to get all students
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/classes/recent-joins?limit=200`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data: Student[] = await res.json();
          setStudents(data);
        }
      } else {
        // Fetch specific class students via class detail
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/classes/${selectedClassId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const className = classes.find((c) => c.id === selectedClassId)?.name || '';
          const mapped: Student[] = (data.students || []).map((s: ClassStudent) => ({
            id: s.id,
            email: s.email,
            first_name: s.first_name,
            last_name: s.last_name,
            joined_at: s.joined_at,
            class_id: selectedClassId,
            class_name: className,
          }));
          setStudents(mapped);
        }
      }
    } catch (err) {
      console.error('Failed to fetch students', err);
    } finally {
      setIsLoadingStudents(false);
    }
  }, [selectedClassId, classes]);

  useEffect(() => {
    if (!isLoadingClasses) {
      fetchStudents();
    }
  }, [selectedClassId, isLoadingClasses, fetchStudents]);

  const filteredStudents = students.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = `${s.first_name} ${s.last_name}`.toLowerCase();
    return name.includes(q) || s.email.toLowerCase().includes(q) || s.class_name.toLowerCase().includes(q);
  });

  return (
    <ProtectedRoute allowedRoles={['TEACHER']}>
      <div className="bg-[#0a0a0f] min-h-full">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100">Students</h1>
            <p className="text-gray-400 mt-1">View and manage students across all your classes.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-3xl font-bold text-gray-100">
                {isLoadingClasses ? '—' : classes.reduce((sum, c) => sum + c.student_count, 0)}
              </p>
              <p className="text-sm text-gray-400 mt-1">Total Students</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-3xl font-bold text-gray-100">
                {isLoadingClasses ? '—' : classes.length}
              </p>
              <p className="text-sm text-gray-400 mt-1">Classes</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-3xl font-bold text-gray-100">
                {isLoadingClasses || classes.length === 0 ? '—' : Math.round(classes.reduce((sum, c) => sum + c.student_count, 0) / classes.length)}
              </p>
              <p className="text-sm text-gray-400 mt-1">Avg per Class</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
              />
            </div>

            {/* Class filter */}
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
            >
              <option value="all">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.student_count})
                </option>
              ))}
            </select>
          </div>

          {/* Students table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-100">
                {selectedClassId === 'all' ? 'Recent Students' : classes.find((c) => c.id === selectedClassId)?.name}
              </h2>
              <span className="text-sm text-gray-500">
                {isLoadingStudents ? 'Loading...' : `${filteredStudents.length} student${filteredStudents.length !== 1 ? 's' : ''}`}
              </span>
            </div>

            {isLoadingStudents ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <p className="text-gray-400 font-medium">No students found</p>
                <p className="text-gray-600 text-sm mt-1">
                  {searchQuery ? 'Try adjusting your search.' : 'No students have joined yet.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {filteredStudents.map((student) => {
                  const initials = getInitials(student.first_name, student.last_name, student.email);
                  const name = `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.email;
                  return (
                    <div key={`${student.id}-${student.class_id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-800/30 transition-colors">
                      {/* Avatar */}
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                        {initials}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-100 truncate">{name}</p>
                        <p className="text-xs text-gray-500 truncate">{student.email}</p>
                      </div>

                      {/* Class badge */}
                      {selectedClassId === 'all' && (
                        <Link
                          href={`/dashboard/teacher/classes/${student.class_id}`}
                          className="hidden sm:inline-flex px-2.5 py-1 text-xs font-medium bg-gray-800 text-gray-300 rounded-md border border-gray-700 hover:border-gray-600 hover:text-gray-100 transition-colors shrink-0"
                        >
                          {student.class_name}
                        </Link>
                      )}

                      {/* Joined date */}
                      <span className="text-xs text-gray-500 shrink-0">
                        Joined {formatDate(student.joined_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
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
