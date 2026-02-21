'use client';
import Link from 'next/link';

export default function PublicHeader() {
  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
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
        </div>
      </div>
    </header>
  );
}
