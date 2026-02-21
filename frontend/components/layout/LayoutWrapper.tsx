'use client';

import { useAuth } from '@/contexts/auth-context';
import { usePathname } from 'next/navigation';
import { PublicHeader, AuthHeader, Footer } from '@/components/layout';

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Public routes that should always show public layout
  const publicRoutes = ['/', '/about', '/contact', '/login', '/register'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // If on public route or not authenticated, show public layout
  if (isPublicRoute || !isAuthenticated) {
    return (
      <>
        <PublicHeader />
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
      </>
    );
  }

  // Authenticated layout (sidebar pages handle their own sidebar)
  return (
    <>
      <AuthHeader />
      <main className="flex-1 pt-16">{children}</main>
    </>
  );
}
