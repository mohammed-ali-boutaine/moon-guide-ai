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
  login: (email: string, password: string) => Promise<void>;
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

  const fetchUser = useCallback(async (accessToken: string): Promise<User | null> => {
    try {
      const response = await fetch(`${API_URL}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const userData: User = await response.json();
        setUser(userData);
        log.debug('User fetched', { id: userData.id, role: userData.role });
        return userData;
      }
      log.warn('fetchUser: non-ok response', { status: response.status });
      return null;
    } catch (error) {
      log.error('Failed to fetch user', error);
      return null;
    }
  }, [API_URL]);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        log.debug('Token refreshed');
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
      const accessToken = localStorage.getItem('access_token');
      if (accessToken) {
        const userData = await fetchUser(accessToken);
        if (!userData) {
          const refreshed = await refreshToken();
          if (refreshed) {
            const newToken = localStorage.getItem('access_token');
            if (newToken) await fetchUser(newToken);
          } else {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            log.info('Session expired — cleared tokens');
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [fetchUser, refreshToken]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      log.info('Login attempt', { email });
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);

      // Single fetch to get user data + redirect without extra round-trip
      const userData = await fetchUser(data.access_token);
      log.info('Login successful', { role: userData?.role });

      if (userData?.role === 'ADMIN') {
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

      const result = await response.json();
      localStorage.setItem('access_token', result.access_token);
      localStorage.setItem('refresh_token', result.refresh_token);

      await fetchUser(result.access_token);
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
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      await fetchUser(accessToken);
    }
  }, [fetchUser]);

  const logout = async () => {
    const refreshTokenValue = localStorage.getItem('refresh_token');
    if (refreshTokenValue) {
      try {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshTokenValue }),
        });
        log.info('Logout successful');
      } catch (error) {
        log.error('Logout error', error);
      }
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    router.push('/login');
  };

  const deleteAccount = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) throw new Error('Not authenticated');

    log.warn('Delete account requested');
    const response = await fetch(`${API_URL}/api/users/me`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      log.error('Delete account failed', { status: response.status });
      throw new Error(err.detail || 'Failed to delete account. Please try again.');
    }

    log.info('Account deleted');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
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
