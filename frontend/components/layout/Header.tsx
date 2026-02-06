import Link from 'next/link';

export default function Header() {
  return (
    <header className="border-b bg-white shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500" />
          <span className="text-xl font-bold text-gray-900">
            Moon Guide AI
          </span>
        </Link>

        <nav className="flex items-center space-x-6">
          <Link
            href="/"
            className="text-sm font-medium text-gray-700 transition-colors hover:text-primary-600"
          >
            Accueil
          </Link>
          <Link
            href="/documents"
            className="text-sm font-medium text-gray-700 transition-colors hover:text-primary-600"
          >
            Documents
          </Link>
          <Link
            href="/quiz"
            className="text-sm font-medium text-gray-700 transition-colors hover:text-primary-600"
          >
            Quiz
          </Link>
          <Link
            href="/career"
            className="text-sm font-medium text-gray-700 transition-colors hover:text-primary-600"
          >
            Carrière
          </Link>
        </nav>
      </div>
    </header>
  );
}
