'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStudentClasses } from '@/hooks/use-classes';
import { ProtectedRoute } from '@/components/auth';
import { LoadingSpinner } from '@/components/ui';
import ChatWindow from '@/components/chat/ChatWindow';

function ClassChatContent() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const { data: classesData, isLoading } = useStudentClasses(1, 100);
  const classDetail = classesData?.items.find((c) => c.id === classId);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#0a0a0f]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!classDetail) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center max-w-sm">
          <h2 className="text-xl font-semibold text-gray-300 mb-2">Class Not Found</h2>
          <p className="text-gray-400 mb-4">
            This class does not exist or you do not have access to it.
          </p>
          <button
            onClick={() => router.push('/dashboard/student/classes')}
            className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            Back to Classes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Breadcrumb bar */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-800 bg-gray-900/50 flex-shrink-0">
        <nav className="text-sm">
          <ol className="flex items-center flex-wrap gap-1 text-gray-400">
            <li>
              <Link href="/dashboard/student" className="hover:text-primary-400 transition-colors">
                Dashboard
              </Link>
            </li>
            <li>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </li>
            <li>
              <Link href="/dashboard/student/classes" className="hover:text-primary-400 transition-colors">
                My Classes
              </Link>
            </li>
            <li>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </li>
            <li>
              <Link href={`/dashboard/student/classes/${classId}`} className="hover:text-primary-400 transition-colors">
                {classDetail.name}
              </Link>
            </li>
            <li>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </li>
            <li className="text-white font-medium">AI Chat</li>
          </ol>
        </nav>
      </div>

      {/* Chat area */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 min-h-0">
        <div className="h-full max-w-6xl mx-auto" style={{ minHeight: 'calc(100vh - 130px)' }}>
          <ChatWindow
            classId={classId}
            title={`${classDetail.name} — AI Assistant`}
          />
        </div>
      </div>
    </div>
  );
}

export default function ClassChatPage() {
  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <ClassChatContent />
    </ProtectedRoute>
  );
}
