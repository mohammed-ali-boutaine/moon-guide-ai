'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function PublicHeader() {
  const [isScrolled, setIsScrolled] = useState(false);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/features', label: 'Features' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 border-b border-gray-800 bg-black/95 backdrop-blur-sm shadow-md transition-all duration-300 ${
      isScrolled ? 'h-14' : 'h-16'
    }`}>
      <div className="container mx-auto flex h-full items-center justify-between px-4">
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
