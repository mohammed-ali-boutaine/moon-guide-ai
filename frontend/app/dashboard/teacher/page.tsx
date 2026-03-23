'use client';

import { useState, useRef } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useClassContext } from '@/contexts/class-context';
import { useClassDocuments } from '@/hooks/use-documents';
import { useUploadClassDocument } from '@/hooks/use-documents';
import {
  useTeacherQuizzes,
  useGenerateQuiz,
  useQuizJob,
  useAssignQuiz,
} from '@/hooks/use-quiz';
import ChatWindow from '@/components/chat/ChatWindow';
import Link from 'next/link';
import type { QuizDifficulty } from '@/types/quiz';

// ── No-class empty state ───────────────────────────────────────────────────────

function NoClassSelected({ classes }: { classes: Array<{ id: string; name: string; student_count: number }> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-100 mb-2">Select a class to start chatting</h2>
      <p className="text-gray-400 text-sm mb-8 max-w-sm">
        Choose a class from the selector in the top navigation bar. The AI assistant will answer questions based on that class&apos;s documents.
      </p>
      {classes.length > 0 && (
        <div className="w-full max-w-sm space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">Your classes</p>
          {classes.map((cls) => (
            <Link
              key={cls.id}
              href={`/dashboard/teacher/classes/${cls.id}`}
              className="flex items-center justify-between px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 hover:bg-gray-800/60 transition-colors"
            >
              <div className="text-left">
                <p className="text-sm font-medium text-gray-100">{cls.name}</p>
                <p className="text-xs text-gray-500">{cls.student_count} students</p>
              </div>
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Upload Document Modal ─────────────────────────────────────────────────────

function UploadDocModal({ classId, onClose }: { classId: string; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadMutation = useUploadClassDocument(classId);

  async function handleSubmit() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setError(null);
    setProgress(0);
    try {
      await uploadMutation.mutateAsync({ file, onProgress: setProgress });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setProgress(null);
    }
  }

  return (
    <Modal title="Upload Document" onClose={onClose}>
      {done ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-green-900/40 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-gray-200 font-medium mb-1">Document uploaded</p>
          <p className="text-sm text-gray-400 mb-4">Processing will start in the background.</p>
          <button onClick={onClose} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors">
            Done
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-400 mb-4">Upload a PDF, DOCX, or TXT file to this class. It will be processed and embedded for the AI assistant.</p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            className="w-full text-sm text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-600 file:text-white hover:file:bg-primary-700 file:cursor-pointer mb-4"
          />
          {progress !== null && (
            <div className="mb-4">
              <div className="h-1.5 bg-gray-800 rounded-full">
                <div className="h-1.5 bg-primary-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-1">{progress}%</p>
            </div>
          )}
          {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={uploadMutation.isPending}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ── Generate Quiz Modal ───────────────────────────────────────────────────────

function GenerateQuizModal({ classId, onClose }: { classId: string; onClose: () => void }) {
  const [docId, setDocId] = useState<number | null>(null);
  const [numQ, setNumQ] = useState(10);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('medium');
  const [jobId, setJobId] = useState<string | null>(null);

  const { data: docsData, isLoading: docsLoading } = useClassDocuments(classId);
  const readyDocs = (docsData?.documents ?? []).filter((d) => d.status === 'ready');

  const generate = useGenerateQuiz();
  const { data: jobData } = useQuizJob(jobId);

  async function handleGenerate() {
    if (!docId) return;
    const res = await generate.mutateAsync({ document_id: docId, num_questions: numQ, difficulty });
    setJobId(res.job_id);
  }

  const jobStatus = jobData?.status;
  const isDone = jobStatus === 'completed';
  const isFailed = jobStatus === 'failed';
  const isPolling = !!jobId && !isDone && !isFailed;

  return (
    <Modal title="Generate Quiz with AI" onClose={onClose}>
      {isDone ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-green-900/40 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-gray-200 font-medium mb-1">Quiz generated!</p>
          <p className="text-sm text-gray-400 mb-4">Your quiz is ready. Go to the Quizzes page to review and publish it.</p>
          <div className="flex justify-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">Close</button>
            <Link href="/dashboard/teacher/quizzes" onClick={onClose} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors">
              View Quizzes
            </Link>
          </div>
        </div>
      ) : isFailed ? (
        <div className="text-center py-4">
          <p className="text-red-400 font-medium mb-2">Generation failed</p>
          <p className="text-sm text-gray-400 mb-4">{jobData?.error_message || 'An error occurred.'}</p>
          <button onClick={() => setJobId(null)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">Try again</button>
        </div>
      ) : isPolling ? (
        <div className="text-center py-6">
          <div className="w-10 h-10 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-300 font-medium">Generating quiz…</p>
          <p className="text-sm text-gray-500 mt-1">This may take 30–60 seconds</p>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Document</label>
              {docsLoading ? (
                <p className="text-sm text-gray-500">Loading documents…</p>
              ) : readyDocs.length === 0 ? (
                <p className="text-sm text-gray-500">No ready documents in this class. Upload and process a document first.</p>
              ) : (
                <select
                  value={docId ?? ''}
                  onChange={(e) => setDocId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                >
                  <option value="">Select a document…</option>
                  {readyDocs.map((d) => (
                    <option key={d.id} value={d.id}>{d.filename}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Number of questions: {numQ}</label>
              <input
                type="range" min={5} max={30} step={5} value={numQ}
                onChange={(e) => setNumQ(Number(e.target.value))}
                className="w-full accent-primary-600"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1"><span>5</span><span>30</span></div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Difficulty</label>
              <div className="flex gap-2">
                {(['easy', 'medium', 'hard'] as QuizDifficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                      difficulty === d
                        ? 'bg-primary-600 border-primary-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {generate.isError && (
            <p className="text-sm text-red-400 mb-3">{generate.error instanceof Error ? generate.error.message : 'Error'}</p>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">Cancel</button>
            <button
              onClick={handleGenerate}
              disabled={!docId || readyDocs.length === 0 || generate.isPending}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {generate.isPending ? 'Starting…' : 'Generate'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ── Assign Quiz Modal ─────────────────────────────────────────────────────────

function AssignQuizModal({ classId, onClose }: { classId: string; onClose: () => void }) {
  const [quizId, setQuizId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [done, setDone] = useState(false);

  const { data: quizzesData, isLoading } = useTeacherQuizzes();
  const assignMutation = useAssignQuiz();

  const publishedQuizzes = (quizzesData?.items ?? []).filter((q) => q.status === 'published');

  async function handleAssign() {
    if (!quizId) return;
    try {
      await assignMutation.mutateAsync({
        quizId,
        classId,
        dueDate: dueDate || undefined,
      });
      setDone(true);
    } catch {
      // error shown below
    }
  }

  return (
    <Modal title="Assign Quiz to Class" onClose={onClose}>
      {done ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-green-900/40 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-gray-200 font-medium mb-1">Quiz assigned!</p>
          <p className="text-sm text-gray-400 mb-4">Students in this class will be notified.</p>
          <button onClick={onClose} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors">Done</button>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Quiz</label>
              {isLoading ? (
                <p className="text-sm text-gray-500">Loading quizzes…</p>
              ) : publishedQuizzes.length === 0 ? (
                <p className="text-sm text-gray-500">No published quizzes found. Publish a quiz first.</p>
              ) : (
                <select
                  value={quizId ?? ''}
                  onChange={(e) => setQuizId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                >
                  <option value="">Select a quiz…</option>
                  {publishedQuizzes.map((q) => (
                    <option key={q.id} value={q.id}>{q.title}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Due date (optional)</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              />
            </div>
          </div>
          {assignMutation.isError && (
            <p className="text-sm text-red-400 mb-3">
              {assignMutation.error instanceof Error ? assignMutation.error.message : 'Failed to assign quiz'}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">Cancel</button>
            <button
              onClick={handleAssign}
              disabled={!quizId || publishedQuizzes.length === 0 || assignMutation.isPending}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {assignMutation.isPending ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ── Shared Modal shell ────────────────────────────────────────────────────────

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-gray-100">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Teacher Dashboard ─────────────────────────────────────────────────────────

type ActionModal = 'upload' | 'generate' | 'assign' | null;

export default function TeacherDashboard() {
  const { classes, selectedClass, selectedClassId } = useClassContext();
  const [modal, setModal] = useState<ActionModal>(null);

  return (
    <ProtectedRoute allowedRoles={['TEACHER']}>
      <div className="h-[calc(100vh-64px)] flex flex-col bg-[#0a0a0f]">

        {selectedClassId && selectedClass ? (
          <>
            {/* Action chips bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-800 bg-gray-900/40 flex-shrink-0 flex-wrap">
              <span className="text-xs text-gray-500 mr-1 hidden sm:inline">Quick actions:</span>

              <button
                onClick={() => setModal('upload')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-950/60 border border-blue-900/60 hover:bg-blue-950 text-blue-300 text-xs font-medium rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Document
              </button>

              <button
                onClick={() => setModal('generate')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-950/60 border border-purple-900/60 hover:bg-purple-950 text-purple-300 text-xs font-medium rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Generate Quiz
              </button>

              <button
                onClick={() => setModal('assign')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-950/60 border border-green-900/60 hover:bg-green-950 text-green-300 text-xs font-medium rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Assign Quiz
              </button>

              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-gray-500 hidden sm:inline">{selectedClass.name}</span>
                <Link
                  href={`/dashboard/teacher/classes/${selectedClassId}`}
                  className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Manage class →
                </Link>
              </div>
            </div>

            {/* Chat fills remaining height */}
            <div className="flex-1 min-h-0">
              <ChatWindow
                classId={selectedClassId}
                title={`${selectedClass.name} — AI Assistant`}
              />
            </div>
          </>
        ) : (
          <NoClassSelected classes={classes} />
        )}
      </div>

      {/* Modals */}
      {modal === 'upload' && selectedClassId && (
        <UploadDocModal classId={selectedClassId} onClose={() => setModal(null)} />
      )}
      {modal === 'generate' && selectedClassId && (
        <GenerateQuizModal classId={selectedClassId} onClose={() => setModal(null)} />
      )}
      {modal === 'assign' && selectedClassId && (
        <AssignQuizModal classId={selectedClassId} onClose={() => setModal(null)} />
      )}
    </ProtectedRoute>
  );
}
