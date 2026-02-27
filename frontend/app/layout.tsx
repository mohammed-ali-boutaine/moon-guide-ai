import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { QueryProvider } from '@/contexts/query-provider';
import LayoutWrapper from '@/components/layout/LayoutWrapper';
import { NotificationProvider } from '@/contexts/notification-context';
import { ToastContainer } from '@/components/ui/Toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Moon Guide AI - AI-Powered Learning & Career Assistant',
  description:
    'Your personal AI assistant for learning and career growth, powered by RAG, NLP, and personalization.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-screen flex-col">
        <NotificationProvider>
          <QueryProvider>
            <AuthProvider>
              <LayoutWrapper>{children}</LayoutWrapper>
            </AuthProvider>
          </QueryProvider>
          <ToastContainer />
        </NotificationProvider>
      </body>
    </html>
  );
}