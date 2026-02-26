'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';
import { createLogger } from '@/lib/logger';

const log = createLogger('LoginPage');

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    log.debug('Login form submitted');

    try {
      await login(email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred. Please try again.';
      log.warn('Login form error', { message });
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-100 mb-2">Sign In</h1>
          <p className="text-gray-400">Welcome back! Sign in to your account</p>
        </div>

        {/* Login Form */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-950 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all placeholder:text-gray-500"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all placeholder:text-gray-500"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 bg-gray-800 border-gray-700 rounded focus:ring-primary-500 text-primary-600"
                />
                <span className="ml-2 text-sm text-gray-400">Remember me</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-primary-400 hover:text-primary-300"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gray-100 text-gray-900 py-3 px-4 rounded-lg font-semibold hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-500">Or</span>
            </div>
          </div>

          {/* Google Login */}
          <GoogleLoginButton LabelContent="Sign in with Google"/>
        </div>

        {/* Sign Up Link */}
        <p className="text-center mt-6 text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-primary-400 hover:text-primary-300">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}