'use client';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();

  const getDashboardLink = () => {
    if (!user?.role) return '/';
    switch (user.role) {
      case 'ADMIN': return '/dashboard/admin';
      case 'TEACHER': return '/dashboard/teacher';
      case 'STUDENT': return '/dashboard/student';
      default: return '/';
    }
  };

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
          {['/', '/documents', '/quiz', '/career'].map((href, i) => {
            const labels = ['Accueil', 'Documents', 'Quiz', 'Carrière'];
            return (
              <Link
                key={href}
                href={href}
                className="text-sm font-medium text-gray-400 px-4 py-2 rounded-md transition-colors hover:text-white hover:bg-white/10"
              >
                {labels[i]}
              </Link>
            );
          })}
        </nav>

        {/* Auth Section */}
        <div className="flex items-center space-x-3">
          {isAuthenticated ? (
            <>
              <Link
                href={getDashboardLink()}
                className="flex items-center space-x-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-black font-semibold text-xs">
                  {user?.profile?.first_name?.[0]}{user?.profile?.last_name?.[0]}
                </div>
                <span>{user?.profile?.first_name}</span>
              </Link>
              <button
                onClick={logout}
                className="text-sm font-medium text-gray-400 hover:text-white border border-gray-700 hover:border-white px-3 py-1.5 rounded-md transition-all"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-400 hover:text-white px-4 py-2 rounded-md transition-colors hover:bg-white/10"
              >
                Connexion
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium text-black bg-white px-4 py-2 rounded-md transition-all hover:bg-gray-200 shadow-sm"
              >
                S&apos;inscrire
              </Link>
            </>
          )}
        </div>

      </div>
    </header>
  );
}