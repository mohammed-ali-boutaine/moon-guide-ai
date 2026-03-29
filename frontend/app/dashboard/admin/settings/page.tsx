'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
    <h2 className="text-sm font-semibold text-gray-300 mb-4">{title}</h2>
    {children}
  </div>
);

const Row = ({ label, value, badge }: { label: string; value: string; badge?: string }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-gray-800 last:border-0">
    <span className="text-sm text-gray-400">{label}</span>
    <div className="flex items-center gap-2">
      {badge && (
        <span className="px-2 py-0.5 text-xs bg-green-900/40 text-green-300 border border-green-800 rounded-full">{badge}</span>
      )}
      <span className="text-sm text-gray-200 font-mono">{value}</span>
    </div>
  </div>
);

export default function AdminSettingsPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-xl font-bold text-gray-100 mb-6">Settings</h1>

        <div className="space-y-4">
          <Section title="Platform">
            <Row label="Application Name" value="Moon Guide AI" />
            <Row label="Version" value="1.0.0" />
            <Row label="API URL" value={API_URL} />
          </Section>

          <Section title="Authentication">
            <Row label="Token Algorithm" value="HS256" />
            <Row label="Access Token Expiry" value="15 minutes" />
            <Row label="Refresh Token Expiry" value="7 days" />
            <Row label="Cookie Mode" value="HttpOnly + SameSite=Lax" badge="Secure" />
          </Section>

          <Section title="Default Accounts">
            <Row label="Admin Email" value="moon@gmail.com" />
            <Row label="Teacher Email" value="teacher@moon.com" />
          </Section>

          <Section title="AI & Embeddings">
            <Row label="LLM Provider" value="Ollama / Gemini / Mistral" />
            <Row label="Embedding Provider" value="Gemini" />
            <Row label="Embedding Model" value="text-embedding-004" />
            <Row label="RAG Top-K" value="5 chunks" />
          </Section>

          <Section title="Documents">
            <Row label="Max File Size" value="50 MB" />
            <Row label="Supported Types" value="PDF, DOCX, TXT, MD" />
            <Row label="Chunk Size" value="1000 tokens" />
            <Row label="Chunk Overlap" value="120 tokens" />
          </Section>

          <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-2xl p-4">
            <p className="text-xs text-yellow-400">
              Settings are managed via environment variables. To change configuration, update the <span className="font-mono">.env</span> file and restart the backend service.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
