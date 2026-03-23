'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!user || !user.role) {
      router.push('/login');
      return;
    }

    // Redirect based on user role
    switch (user.role) {
      case 'ADMIN':
        router.push('/dashboard/admin');
        break;
      case 'TEACHER':
        router.push('/dashboard/teacher');
        break;
      case 'STUDENT':
        router.push('/dashboard/student');
        break;
      default:
        router.push('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Loading dashboard...</h2>
        <p className="text-gray-500">Redirecting you to your dashboard.</p>
      </div>
    </div>
  );
}
