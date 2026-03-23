'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface NotificationContextType {
  toasts: Toast[];
  notify: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, type: ToastType = 'info', duration = 4000) => {
      const id = Math.random().toString(36).slice(2);
      const toast: Toast = { id, type, message, duration };
      setToasts((prev) => [...prev, toast]);
      if (duration > 0) {
        timers.current[id] = setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss]
  );

  const success = useCallback((m: string, d?: number) => notify(m, 'success', d), [notify]);
  const error = useCallback((m: string, d?: number) => notify(m, 'error', d), [notify]);
  const warning = useCallback((m: string, d?: number) => notify(m, 'warning', d), [notify]);
  const info = useCallback((m: string, d?: number) => notify(m, 'info', d), [notify]);

  return (
    <NotificationContext.Provider value={{ toasts, notify, success, error, warning, info, dismiss }}>
      {children}
      {/* ARIA live region for accessibility */}
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {toasts.map((t) => (
          <span key={t.id}>{t.message}</span>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
}
