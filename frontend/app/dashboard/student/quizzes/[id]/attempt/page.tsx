'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/protected-route';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useQuiz } from '@/hooks/use-quiz';
import type {
  QuizAttemptStartResponse,
  QuizAttemptSubmitResponse,
  QuestionResponse,
} from '@/types/quiz';

// ─────────────────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const FETCH_OPTS: RequestInit = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
};

type Answers = Record<number, string>; // question_id → answer_text

function lsKey(quizId: string, attemptId: number) {
  return `quiz_attempt_${quizId}_${attemptId}`;
}

// ── Countdown timer ───────────────────────────────────────────────────────────

function CountdownTimer({
  expiresAt,
  onExpired,
  onWarning,
}: {
  expiresAt: string;
  onExpired: () => void;
  onWarning: (msg: string | null) => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );
  const onExpiredRef = useRef(onExpired);
  const onWarningRef = useRef(onWarning);
  onExpiredRef.current = onExpired;
  onWarningRef.current = onWarning;

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(diff);
      if (diff <= 0) {
        onExpiredRef.current();
        return;
      }
      if (diff <= 30) {
        onWarningRef.current('30 secondes restantes ! Soumettez maintenant.');
      } else if (diff <= 60) {
        onWarningRef.current('Moins d\'1 minute restante !');
      } else {
        onWarningRef.current(null);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isDanger = secondsLeft <= 30;
  const isWarning = secondsLeft <= 60;

  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-bold border
        ${isDanger
          ? 'bg-red-900/50 text-red-300 border-red-700 animate-pulse'
          : isWarning
          ? 'bg-amber-900/50 text-amber-300 border-amber-700'
          : 'bg-gray-800 text-gray-200 border-gray-700'}`}
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" strokeWidth="2" />
        <polyline points="12,6 12,12 16,14" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {minutes}:{String(seconds).padStart(2, '0')}
    </div>
  );
}

// ── Question navigation bar ───────────────────────────────────────────────────

function QuestionBar({
  questions,
  currentIdx,
  answers,
  onJump,
}: {
  questions: QuestionResponse[];
  currentIdx: number;
  answers: Answers;
  onJump: (idx: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {questions.map((q, idx) => {
        const answered = answers[q.id] !== undefined && answers[q.id] !== '';
        const isCurrent = idx === currentIdx;
        return (
          <button
            key={q.id}
            onClick={() => onJump(idx)}
            title={`Question ${idx + 1}${answered ? ' (répondue)' : ''}`}
            className={`w-8 h-8 rounded-full text-xs font-semibold border transition-all focus:outline-none
              ${isCurrent
                ? 'bg-primary-600 text-white border-primary-500 ring-2 ring-primary-400/30 scale-110'
                : answered
                ? 'bg-primary-900/60 text-primary-300 border-primary-700 hover:scale-105'
                : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500 hover:scale-105'}`}
          >
            {idx + 1}
          </button>
        );
      })}
    </div>
  );
}

// ── MCQ answers ───────────────────────────────────────────────────────────────

function MCQAnswers({
  question,
  value,
  onChange,
  readOnly,
}: {
  question: QuestionResponse;
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-3">
      {question.answers.map((ans) => {
        const selected = value === ans.text;
        return (
          <label
            key={ans.id}
            className={`flex items-start gap-3 p-4 rounded-xl border transition-all
              ${readOnly ? 'cursor-default' : 'cursor-pointer'}
              ${selected
                ? 'border-primary-600 bg-primary-900/30'
                : readOnly
                ? 'border-gray-700 bg-gray-800/30'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'}`}
          >
            <input
              type="radio"
              name={`q_${question.id}`}
              value={ans.text}
              checked={selected}
              disabled={readOnly}
              onChange={() => !readOnly && onChange(ans.text)}
              className="mt-0.5 accent-primary-500 flex-shrink-0"
            />
            <span className="text-gray-200 text-sm leading-relaxed">{ans.text}</span>
          </label>
        );
      })}
    </div>
  );
}

// ── True/False answers ────────────────────────────────────────────────────────

function TrueFalseAnswers({
  question,
  value,
  onChange,
  readOnly,
}: {
  question: QuestionResponse;
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {question.answers.map((ans) => {
        const selected = value === ans.text;
        return (
          <button
            key={ans.id}
            onClick={() => !readOnly && onChange(ans.text)}
            disabled={readOnly}
            className={`py-5 rounded-xl border text-sm font-semibold transition-all
              ${selected
                ? 'border-primary-600 bg-primary-900/40 text-primary-200'
                : readOnly
                ? 'border-gray-700 bg-gray-800/30 text-gray-500 cursor-default'
                : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-500 hover:bg-gray-800'}`}
          >
            {ans.text}
          </button>
        );
      })}
    </div>
  );
}

// ── Short answer input ────────────────────────────────────────────────────────

function ShortAnswerInput({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={readOnly}
      rows={6}
      placeholder={readOnly ? '' : 'Écrivez votre réponse ici…'}
      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-gray-200 text-sm
        placeholder-gray-500 focus:outline-none focus:border-primary-600 resize-none
        disabled:opacity-50 disabled:cursor-default transition-colors"
    />
  );
}

// ── Submission result view ────────────────────────────────────────────────────

function SubmittedView({
  result,
  quizTitle,
  onBack,
}: {
  result: QuizAttemptSubmitResponse;
  quizTitle: string;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 bg-green-900/30 border border-green-800 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-100 mb-1">Quiz soumis !</h2>
          <p className="text-gray-400 text-sm">{quizTitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-primary-400">{result.answers_recorded}</div>
            <div className="text-xs text-gray-400 mt-1">Réponses enregistrées</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-200">{result.total_questions}</div>
            <div className="text-xs text-gray-400 mt-1">Questions totales</div>
          </div>
        </div>

        <p className="text-sm text-gray-400">
          La correction est en cours. Vous recevrez une notification avec vos résultats.
        </p>

        <button
          onClick={onBack}
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Retour à mes quiz
        </button>
      </div>
    </div>
  );
}

// ── Error view ────────────────────────────────────────────────────────────────

function ErrorView({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-red-900/40 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
        <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-100">Impossible de démarrer le quiz</h2>
        <p className="text-gray-400 text-sm">{message}</p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-sm transition-colors"
        >
          Retour
        </button>
      </div>
    </div>
  );
}

// ── Main content ──────────────────────────────────────────────────────────────

function QuizAttemptContent() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  // ── Quiz data ─────────────────────────────────────────────────────────────
  const { data: quiz, isLoading: quizLoading } = useQuiz(Number(quizId));

  // ── Attempt bootstrap ─────────────────────────────────────────────────────
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [startError, setStartError] = useState<string | null>(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<QuizAttemptSubmitResponse | null>(null);
  const [timerWarning, setTimerWarning] = useState<string | null>(null);

  // ── Start attempt ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!quizId) return;
    let cancelled = false;

    async function start() {
      try {
        const res = await fetch(`${API_URL}/api/v1/quiz/${quizId}/start`, {
          method: 'POST',
          ...FETCH_OPTS,
        });

        if (cancelled) return;

        if (res.status === 409) {
          // An active attempt already exists — resume it
          const body = await res.json().catch(() => ({}));
          const existingId: number | undefined = body?.detail?.attempt_id;
          if (existingId) {
            setAttemptId(existingId);
            const saved = localStorage.getItem(lsKey(quizId, existingId));
            if (saved) {
              try { setAnswers(JSON.parse(saved)); } catch {}
            }
            setStarting(false);
            return;
          }
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const msg =
            typeof body?.detail === 'string'
              ? body.detail
              : body?.detail?.message ?? 'Impossible de démarrer le quiz.';
          setStartError(msg);
          setStarting(false);
          return;
        }

        const data: QuizAttemptStartResponse = await res.json();
        setAttemptId(data.attempt_id);
        setExpiresAt(data.expires_at);
        setStarting(false);
      } catch {
        if (!cancelled) {
          setStartError('Erreur réseau. Vérifiez votre connexion.');
          setStarting(false);
        }
      }
    }

    start();
    return () => { cancelled = true; };
  }, [quizId]);

  // ── Load saved answers from localStorage once attempt is known ────────────
  useEffect(() => {
    if (!attemptId) return;
    const saved = localStorage.getItem(lsKey(quizId, attemptId));
    if (saved) {
      try { setAnswers(JSON.parse(saved)); } catch {}
    }
  }, [quizId, attemptId]);

  // ── Autosave to localStorage every 30 s ───────────────────────────────────
  useEffect(() => {
    if (!attemptId || submitted) return;
    const id = setInterval(() => {
      localStorage.setItem(lsKey(quizId, attemptId), JSON.stringify(answers));
    }, 30_000);
    return () => clearInterval(id);
  }, [quizId, attemptId, answers, submitted]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAnswer = useCallback((questionId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!attemptId || submitting || submitted) return;

    const questions = quiz?.questions ?? [];
    const payload = questions.map((q) => ({
      question_id: q.id,
      answer_text: answers[q.id] ?? null,
    }));

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/quiz/${attemptId}/submit`, {
        method: 'POST',
        ...FETCH_OPTS,
        body: JSON.stringify({ answers: payload }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(
          typeof body?.detail === 'string'
            ? body.detail
            : body?.detail?.message ?? 'La soumission a échoué. Réessayez.'
        );
        return;
      }

      const data: QuizAttemptSubmitResponse = await res.json();
      setSubmitResult(data);
      setSubmitted(true);
      localStorage.removeItem(lsKey(quizId, attemptId));
    } catch {
      alert('Erreur réseau. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  }, [attemptId, submitting, submitted, quiz, answers, quizId]);

  // handleExpired kept stable via ref to avoid re-running timer effect
  const handleExpiredRef = useRef(handleSubmit);
  handleExpiredRef.current = handleSubmit;
  const handleExpired = useCallback(() => handleExpiredRef.current(), []);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (quizLoading || starting) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-gray-400 text-sm animate-pulse">
            {starting ? 'Démarrage de la tentative…' : 'Chargement du quiz…'}
          </p>
        </div>
      </div>
    );
  }

  if (startError) {
    return <ErrorView message={startError} onBack={() => router.back()} />;
  }

  if (!quiz) return null;

  // ── Submitted ─────────────────────────────────────────────────────────────
  if (submitted && submitResult) {
    return (
      <SubmittedView
        result={submitResult}
        quizTitle={quiz.title}
        onBack={() => router.push('/dashboard/student/quizzes')}
      />
    );
  }

  const questions = quiz.questions;
  const currentQuestion = questions[currentIdx];
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === questions.length - 1;
  const answeredCount = questions.filter(
    (q) => answers[q.id] !== undefined && answers[q.id] !== ''
  ).length;
  const progress = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-[#0a0a0f]/90 backdrop-blur border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          {/* Back */}
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors flex-shrink-0"
            title="Retour"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-gray-100 truncate">{quiz.title}</h1>
            {quiz.difficulty && (
              <span className="text-xs text-gray-500 capitalize">{quiz.difficulty}</span>
            )}
          </div>

          {/* Right side: counter + timer */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="hidden sm:block text-xs text-gray-400 tabular-nums">
              {answeredCount}/{questions.length}
            </span>
            {expiresAt && (
              <CountdownTimer
                expiresAt={expiresAt}
                onExpired={handleExpired}
                onWarning={setTimerWarning}
              />
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-gray-800">
          <div
            className="h-full bg-primary-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* ── Timer warning banner ────────────────────────────────────────────── */}
      {timerWarning && (
        <div
          className={`text-center text-xs font-semibold py-2 px-4 transition-colors
            ${timerWarning.includes('30')
              ? 'bg-red-900/40 text-red-300 border-b border-red-900'
              : 'bg-amber-900/40 text-amber-300 border-b border-amber-900'}`}
        >
          {timerWarning}
        </div>
      )}

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 space-y-5">
        {/* ── Question navigation bar ───────────────────────────────────────── */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Navigation
            </span>
            <span className="text-xs text-gray-500 tabular-nums">
              {answeredCount} / {questions.length} répondues
            </span>
          </div>
          <QuestionBar
            questions={questions}
            currentIdx={currentIdx}
            answers={answers}
            onJump={setCurrentIdx}
          />
        </div>

        {/* ── Question card ─────────────────────────────────────────────────── */}
        {currentQuestion && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
            {/* Question header */}
            <div className="flex items-start gap-4">
              <span className="flex-shrink-0 w-9 h-9 bg-primary-900/50 border border-primary-800 rounded-xl flex items-center justify-center text-sm font-bold text-primary-300">
                {currentIdx + 1}
              </span>
              <div className="space-y-2 min-w-0 flex-1">
                <span className="inline-block text-xs px-2.5 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                  {currentQuestion.type === 'MCQ'
                    ? 'Choix multiple'
                    : currentQuestion.type === 'TrueFalse'
                    ? 'Vrai / Faux'
                    : 'Réponse courte'}
                </span>
                <p className="text-gray-100 font-medium leading-relaxed">{currentQuestion.text}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-800" />

            {/* Answer input */}
            {currentQuestion.type === 'MCQ' && (
              <MCQAnswers
                question={currentQuestion}
                value={answers[currentQuestion.id] ?? ''}
                onChange={(v) => handleAnswer(currentQuestion.id, v)}
                readOnly={submitted}
              />
            )}
            {currentQuestion.type === 'TrueFalse' && (
              <TrueFalseAnswers
                question={currentQuestion}
                value={answers[currentQuestion.id] ?? ''}
                onChange={(v) => handleAnswer(currentQuestion.id, v)}
                readOnly={submitted}
              />
            )}
            {currentQuestion.type === 'ShortAnswer' && (
              <ShortAnswerInput
                value={answers[currentQuestion.id] ?? ''}
                onChange={(v) => handleAnswer(currentQuestion.id, v)}
                readOnly={submitted}
              />
            )}
          </div>
        )}

        {/* ── Navigation row ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          {/* Previous */}
          <button
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            disabled={isFirst}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-700 text-gray-300
              hover:border-gray-600 hover:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed
              transition-all text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Précédent
          </button>

          <div className="flex items-center gap-2">
            {/* Always-visible submit (ghost style unless on last question) */}
            {!isLast && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl border border-green-800 bg-green-900/20 text-green-400
                  hover:bg-green-900/40 text-sm font-medium transition-all
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Envoi…' : 'Soumettre'}
              </button>
            )}

            {/* Next OR primary submit on last question */}
            {isLast ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white
                  rounded-xl text-sm font-semibold transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Envoi en cours…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Soumettre le quiz
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white
                  rounded-xl text-sm font-semibold transition-colors"
              >
                Suivant
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── Unanswered reminder (shown when trying to submit with gaps) ───── */}
        {answeredCount < questions.length && isLast && (
          <p className="text-center text-xs text-amber-400">
            {questions.length - answeredCount} question(s) sans réponse. Vous pouvez quand même soumettre.
          </p>
        )}
      </main>
    </div>
  );
}

// ── Page export ───────────────────────────────────────────────────────────────

export default function QuizAttemptPage() {
  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <QuizAttemptContent />
    </ProtectedRoute>
  );
}
