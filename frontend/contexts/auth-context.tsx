'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createLogger } from '@/lib/logger';

const log = createLogger('AuthContext');

interface User {
  id: string;
  email: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN' | null;
  profile: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  } | null;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, redirectTo?: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'STUDENT' | 'TEACHER';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  /** Fetch current user using httpOnly cookie (no Authorization header needed). */
  const fetchUser = useCallback(async (): Promise<User | null> => {
    try {
      const response = await fetch(`${API_URL}/api/users/me`, {
        credentials: 'include', // sends httpOnly access_token cookie
      });

      if (response.ok) {
        const userData: User = await response.json();
        setUser(userData);
        log.debug('User fetched', { id: userData.id, role: userData.role });
        return userData;
      }

      // 401/403 means session is invalid – clear user state
      if (response.status === 401 || response.status === 403) {
        setUser(null);
      }
      log.warn('fetchUser: non-ok response', { status: response.status });
      return null;
    } catch (error) {
      log.error('Failed to fetch user', error);
      return null;
    }
  }, [API_URL]);

  /** Call /refresh – backend reads refresh_token cookie and sets new access_token cookie. */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        log.debug('Token refreshed via cookie');
        return true;
      }
      log.warn('Token refresh failed', { status: response.status });
      return false;
    } catch (error) {
      log.error('Token refresh error', error);
      return false;
    }
  }, [API_URL]);

  useEffect(() => {
    const initAuth = async () => {
      // Try to load user from httpOnly cookie
      const userData = await fetchUser();
      if (!userData) {
        // Cookie may be expired – try refresh
        const refreshed = await refreshToken();
        if (refreshed) {
          await fetchUser();
        } else {
          log.info('Session expired or no session found');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [fetchUser, refreshToken]);

  const login = async (email: string, password: string, redirectTo?: string) => {
    setIsLoading(true);
    try {
      log.info('Login attempt', { email });
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // receive httpOnly cookies in response
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        log.warn('Login failed', { status: response.status, detail: errorBody.detail });

        if (response.status === 401 || response.status === 403) {
          throw new Error('Invalid email or password. Please try again.');
        } else if (response.status === 422) {
          throw new Error('Please enter a valid email and password.');
        } else if (response.status === 429) {
          throw new Error('Too many login attempts. Please wait a moment and try again.');
        } else {
          throw new Error(errorBody.detail || 'Login failed. Please try again.');
        }
      }

      // Cookies are set by the server – just fetch the user profile
      const userData = await fetchUser();
      log.info('Login successful', { role: userData?.role });

      // Use redirectTo if provided (e.g. set by middleware), else redirect by role
      if (redirectTo) {
        router.push(redirectTo);
      } else if (userData?.role === 'ADMIN') {
        router.push('/dashboard/admin');
      } else if (userData?.role === 'TEACHER') {
        router.push('/dashboard/teacher');
      } else {
        router.push('/dashboard/student');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      log.info('Register attempt', { email: data.email, role: data.role });
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // receive httpOnly cookies in response
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        log.warn('Register failed', { status: response.status });
        if (response.status === 409) {
          throw new Error('An account with this email already exists.');
        }
        throw new Error(error.detail || 'Registration failed. Please try again.');
      }

      // Cookies are set by the server – just fetch the user profile
      await fetchUser();
      log.info('Register successful');

      // Redirect based on role
      if (data.role === 'TEACHER') {
        router.push('/dashboard/teacher');
      } else {
        router.push('/dashboard/student');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  const logout = async () => {
    try {
      // Backend reads refresh_token cookie and clears both cookies
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      log.info('Logout successful');
    } catch (error) {
      log.error('Logout error', error);
    }

    setUser(null);
    router.push('/login');
  };

  const deleteAccount = async () => {
    log.warn('Delete account requested');
    const response = await fetch(`${API_URL}/api/users/me`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      log.error('Delete account failed', { status: response.status });
      throw new Error(err.detail || 'Failed to delete account. Please try again.');
    }

    log.info('Account deleted');
    setUser(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        deleteAccount,
        refreshToken,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
