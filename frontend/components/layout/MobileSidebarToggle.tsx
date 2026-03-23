'use client';

import { useState, useEffect } from 'react';

interface MobileSidebarToggleProps {
  isOpen: boolean;
  onClick: () => void;
}

export default function MobileSidebarToggle({ isOpen, onClick }: MobileSidebarToggleProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <button
      onClick={onClick}
      className={`lg:hidden fixed left-4 z-30 p-2 rounded-lg bg-gray-800 text-white shadow-lg transition-all duration-300 ${
        isScrolled ? 'top-16' : 'top-20'
      }`}
    >
      {isOpen ? (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      )}
    </button>
  );
}
