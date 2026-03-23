'use client';

import { useEffect, useState } from 'react';
import { useNotification, Toast as ToastType, ToastType as TType } from '@/contexts/notification-context';

const icons: Record<TType, React.ReactNode> = {
  success: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const styles: Record<TType, string> = {
  success: 'bg-green-950 border-green-800 text-green-400',
  error: 'bg-red-950 border-red-800 text-red-400',
  warning: 'bg-yellow-950 border-yellow-800 text-yellow-400',
  info: 'bg-blue-950 border-blue-800 text-blue-400',
};

function ToastItem({ toast }: { toast: ToastType }) {
  const { dismiss } = useNotification();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm shadow-lg max-w-sm w-full
        transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
        ${styles[toast.type]}`}
    >
      <span className="mt-0.5 shrink-0">{icons[toast.type]}</span>
      <p className="flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => dismiss(toast.id)}
        className="shrink-0 ml-1 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss notification"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useNotification();

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
