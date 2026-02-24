'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'STUDENT' as 'STUDENT' | 'TEACHER',
  });
  const [error, setError] = useState('');
  const { register, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await register({
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        role: formData.role,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-100 mb-2">Create Account</h1>
          <p className="text-gray-400">Start your learning journey today</p>
        </div>

        {/* Registration Form */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-950 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Role Selection — white as primary */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                I am a
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'STUDENT' })}
                  className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                    formData.role === 'STUDENT'
                      ? 'bg-white text-gray-900 shadow-lg shadow-white/10'
                      : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-gray-200'
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'TEACHER' })}
                  className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                    formData.role === 'TEACHER'
                      ? 'bg-white text-gray-900 shadow-lg shadow-white/10'
                      : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-gray-200'
                  }`}
                >
                  Teacher
                </button>
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-2">
                  First name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-white/30 focus:border-white/50 outline-none transition-all placeholder:text-gray-500"
                  placeholder="John"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-2">
                  Last name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-white/30 focus:border-white/50 outline-none transition-all placeholder:text-gray-500"
                  placeholder="Doe"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-white/30 focus:border-white/50 outline-none transition-all placeholder:text-gray-500"
                placeholder="your.email@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-white/30 focus:border-white/50 outline-none transition-all placeholder:text-gray-500"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-white/30 focus:border-white/50 outline-none transition-all placeholder:text-gray-500"
                placeholder="••••••••"
              />
            </div>

            {/* Terms */}
            <div className="flex items-start">
              <input
                id="terms"
                type="checkbox"
                required
                className="w-4 h-4 mt-1 bg-gray-800 border-gray-700 rounded accent-white"
              />
              <label htmlFor="terms" className="ml-2 text-sm text-gray-400">
                I agree to the{' '}
                <Link href="/terms" className="text-white hover:text-gray-200 font-medium underline underline-offset-2">
                  terms of service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-white hover:text-gray-200 font-medium underline underline-offset-2">
                  privacy policy
                </Link>
              </label>
            </div>

            {/* Submit — white primary */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-gray-900 py-3 px-4 rounded-lg font-semibold hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-white/10"
            >
              {isLoading ? 'Creating account...' : 'Create my account'}
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

          {/* Google */}
          <GoogleLoginButton  LabelContent="Sign up with Google"/>
         
        </div>

        {/* Login Link */}
        <p className="text-center mt-6 text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-white hover:text-gray-200">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}