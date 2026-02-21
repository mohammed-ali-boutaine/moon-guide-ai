'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/contexts/auth-context';
import { Sidebar, MobileSidebarToggle } from '@/components/layout';

interface AssignedQuiz {
  id: string;
  quiz_id: string;
  title: string;
  assigned_at: string;
  status: string;
  score: number | null;
}

export default function StudentQuizzesPage() {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Dump data (no backend)
  const [quizzes] = useState<AssignedQuiz[]>([
    { id: '1', quiz_id: 'q1', title: 'Algebra Basics', assigned_at: new Date().toISOString(), status: 'assigned', score: null },
    { id: '2', quiz_id: 'q2', title: 'Intro to Physics', assigned_at: new Date(Date.now() - 86400000).toISOString(), status: 'assigned', score: null },
    { id: '3', quiz_id: 'q3', title: 'Chemistry: Atoms', assigned_at: new Date(Date.now() - 2 * 86400000).toISOString(), status: 'completed', score: 87 },
  ]);

  return (
    <ProtectedRoute allowedRoles={["STUDENT"]}>
      <div className="min-h-screen bg-[#0a0a0f]">
        <div className="flex">
          {/* Mobile Sidebar Toggle */}
          <MobileSidebarToggle isOpen={isSidebarOpen} onClick={() => setIsSidebarOpen(!isSidebarOpen)} />

          {/* Sidebar */}
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} collapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />

          <main className="flex-1 lg:ml-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <h2 className="text-2xl font-semibold text-gray-100 mb-4">My Quizzes</h2>

                  <div className="space-y-4">
                    {quizzes.map((q) => (
                      <div key={q.id} className="p-4 bg-gray-900 border border-gray-800 rounded-lg flex justify-between items-center">
                        <div>
                          <h3 className="font-medium text-gray-100">{q.title}</h3>
                          <p className="text-sm text-gray-400">Assigned: {new Date(q.assigned_at).toLocaleString()}</p>
                          <p className="text-sm text-gray-400">Status: {q.status}{q.score !== null ? ` — ${q.score}%` : ''}</p>
                        </div>
                        <Link href={`/dashboard/student/quizzes/${q.quiz_id}`} className="text-primary-400 hover:text-primary-300 font-medium">
                          Open
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right sidebar area inside quizzes page */}
                <div className="space-y-6">
                  <div className="bg-gray-900 border border-gray-800 rounded-xl">
                    <div className="px-6 py-4 border-b border-gray-800">
                      <h2 className="text-lg font-semibold text-gray-100">Quick Links</h2>
                    </div>
                    <div className="p-6 space-y-3">
                      <Link href="/dashboard/student/classes" className="block text-primary-400 hover:text-primary-300">My Classes</Link>
                      <Link href="/dashboard/student/quizzes" className="block text-primary-400 hover:text-primary-300">My Quizzes</Link>
                      <Link href="/dashboard/student/documents" className="block text-primary-400 hover:text-primary-300">Documents</Link>
                    </div>
                  </div>

                  <div className="bg-gray-900 border border-gray-800 rounded-xl">
                    <div className="px-6 py-4 border-b border-gray-800">
                      <h2 className="text-lg font-semibold text-gray-100">Notes</h2>
                    </div>
                    <div className="p-6 text-sm text-gray-400">This page uses dump data. Connect to the backend to fetch real assignments.</div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
