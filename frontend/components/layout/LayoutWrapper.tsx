'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import { PublicHeader, AuthHeader, Footer, Sidebar, MobileSidebarToggle } from '@/components/layout';

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Redirect from home to dashboard when authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated && pathname === '/') {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

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

  // Authenticated layout — global sidebar shared across all auth pages
  return (
    <>
      <AuthHeader />
      <div className="flex flex-1 pt-16">
        <MobileSidebarToggle
          isOpen={isSidebarOpen}
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          collapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </>
  );
}
