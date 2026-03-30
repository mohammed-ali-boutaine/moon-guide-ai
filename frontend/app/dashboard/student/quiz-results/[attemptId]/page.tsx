'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAttemptResults, useAttemptResultsPolling, useGenerateFeedback } from '@/hooks/use-quiz-results';
import type { QuestionResult } from '@/types/quiz';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatScore(score: number | null): string {
  return score !== null ? `${score.toFixed(1)}%` : '—';
}

function difficultyLabel(d: string | null): string {
  return d === 'easy' ? 'Facile' : d === 'medium' ? 'Moyen' : d === 'hard' ? 'Difficile' : '—';
}

function scoreBg(score: number | null): string {
  if (score === null) return 'bg-gray-100 text-gray-600';
  if (score >= 80) return 'bg-green-100 text-green-800';
  if (score >= 50) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 text-center shadow-sm">
      <div className="text-3xl font-bold text-blue-600">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function ResultBadge({ isCorrect, needsReview }: { isCorrect: boolean | null; needsReview: boolean }) {
  if (needsReview) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
      En attente
    </span>
  );
  if (isCorrect === true) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      ✓ Correct
    </span>
  );
  if (isCorrect === false) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
      ✗ Incorrect
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      Non noté
    </span>
  );
}

function QuestionCard({ q, index }: { q: QuestionResult; index: number }) {
  const [open, setOpen] = useState(false);

  const effectiveScore = q.teacher_score ?? q.score;
  const borderColor = q.is_correct === true ? 'border-l-green-400' : q.is_correct === false ? 'border-l-red-400' : 'border-l-orange-300';

  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${borderColor} shadow-sm overflow-hidden`}>
      {/* Header — always visible */}
      <button
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="flex-shrink-0 text-sm font-semibold text-gray-400 w-6 mt-0.5">
            {index}.
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 leading-snug">{q.question_text}</p>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <ResultBadge isCorrect={q.is_correct} needsReview={q.needs_review} />
              <span className="text-xs text-gray-400">{q.question_type}</span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-400">{q.points} pt{q.points > 1 ? 's' : ''}</span>
              {effectiveScore !== null && (
                <>
                  <span className="text-xs text-gray-400">·</span>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${scoreBg(effectiveScore)}`}>
                    {effectiveScore.toFixed(0)}/100
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <span className="flex-shrink-0 text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-gray-100 space-y-4">
          {/* Answers comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Votre réponse</p>
              <p className="text-sm text-gray-800">{q.student_answer || <em className="text-gray-400">Sans réponse</em>}</p>
            </div>
            {q.correct_answer && (
              <div className="rounded-lg bg-green-50 p-3">
                <p className="text-xs font-semibold text-green-600 mb-1 uppercase tracking-wide">Réponse attendue</p>
                <p className="text-sm text-gray-800">{q.correct_answer}</p>
              </div>
            )}
          </div>

          {/* ShortAnswer — LLM details */}
          {q.question_type === 'ShortAnswer' && (q.bleu_score !== null || q.llm_reasoning) && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 space-y-2">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Analyse NLP</p>
              {q.llm_reasoning && (
                <p className="text-sm text-gray-700">{q.llm_reasoning}</p>
              )}
              {(q.bleu_score !== null || q.rouge_l_score !== null) && (
                <div className="flex gap-4 text-xs text-gray-500">
                  {q.bleu_score !== null && (
                    <span>BLEU : <strong>{(q.bleu_score * 100).toFixed(1)}%</strong></span>
                  )}
                  {q.rouge_l_score !== null && (
                    <span>ROUGE-L : <strong>{(q.rouge_l_score * 100).toFixed(1)}%</strong></span>
                  )}
                </div>
              )}
              {q.teacher_score !== null && (
                <p className="text-xs text-indigo-700 font-medium">
                  Score enseignant : {q.teacher_score.toFixed(0)}/100
                </p>
              )}
            </div>
          )}

          {/* Feedback */}
          {q.feedback_text && (
            <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 space-y-2">
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Feedback personnalisé</p>
              <p className="text-sm text-gray-800">{q.feedback_text}</p>
              {q.key_points.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mt-2 mb-1">Points clés à retenir :</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {q.key_points.map((pt, i) => (
                      <li key={i} className="text-sm text-gray-700">{pt}</li>
                    ))}
                  </ul>
                </div>
              )}
              {q.improvement_suggestion && (
                <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 mt-1">
                  <p className="text-xs font-semibold text-amber-700 mb-0.5">Suggestion d&apos;amélioration</p>
                  <p className="text-sm text-gray-700">{q.improvement_suggestion}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Performance bar ───────────────────────────────────────────────────────────

function PerformanceBar({ score, classAverage }: { score: number | null; classAverage: number | null }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Performance</h3>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Votre score</span>
            <span className="font-semibold text-blue-600">{formatScore(score)}</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-700"
              style={{ width: `${score ?? 0}%` }}
            />
          </div>
        </div>
        {classAverage !== null && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Moyenne classe</span>
              <span className="font-semibold text-gray-600">{formatScore(classAverage)}</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gray-400 transition-all duration-700"
                style={{ width: `${classAverage}%` }}
              />
            </div>
          </div>
        )}
        {score !== null && classAverage !== null && (
          <p className="text-xs text-gray-500 text-right">
            {score >= classAverage
              ? `+${(score - classAverage).toFixed(1)}% au-dessus de la moyenne`
              : `${(classAverage - score).toFixed(1)}% en dessous de la moyenne`}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function QuizResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const router = useRouter();
  const id = parseInt(attemptId ?? '0', 10);

  const [feedbackRequested, setFeedbackRequested] = useState(false);

  const { data: results, isLoading, error } = useAttemptResults(id);

  // Poll only after feedback is requested and not yet generated
  const { data: polledResults } = useAttemptResultsPolling(
    id,
    feedbackRequested && !!results && !results.feedback_generated
  );

  const display = polledResults ?? results;

  const feedbackMutation = useGenerateFeedback(id);

  function handleGenerateFeedback() {
    feedbackMutation.mutate(undefined, {
      onSuccess: () => setFeedbackRequested(true),
    });
  }

  function handlePrint() {
    window.print();
  }

  function handleExportPdf() {
    const url = `/api/quiz/${id}/results/pdf`;
    window.open(url, '_blank');
  }

  // ── Loading / Error states ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Chargement des résultats…
      </div>
    );
  }

  if (error || !display) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-500 text-sm">{error?.message ?? 'Résultats introuvables.'}</p>
        <button
          className="text-sm text-blue-600 underline"
          onClick={() => router.back()}
        >
          Retour
        </button>
      </div>
    );
  }

  const correctCount = display.questions.filter(q => q.is_correct === true).length;
  const incorrectCount = display.questions.filter(q => q.is_correct === false).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 print:py-4">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-400 hover:text-gray-600 mb-2 block print:hidden"
          >
            ← Retour
          </button>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{display.quiz_title}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 flex-wrap">
            {display.quiz_difficulty && (
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
                {difficultyLabel(display.quiz_difficulty)}
              </span>
            )}
            {display.submitted_at && (
              <span>
                Soumis le {new Date(display.submitted_at).toLocaleDateString('fr-FR', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </span>
            )}
            <span>·</span>
            <span>Durée : {formatDuration(display.duration_seconds)}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-shrink-0 print:hidden">
          <button
            onClick={handlePrint}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Imprimer
          </button>
          <button
            onClick={handleExportPdf}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            PDF
          </button>
        </div>
      </div>

      {/* ── Score hero ─────────────────────────────────────────────────────── */}
      <div className={`rounded-2xl p-6 text-center shadow-sm ${scoreBg(display.score)}`}>
        <div className="text-5xl font-bold mb-1">{formatScore(display.score)}</div>
        <div className="text-sm opacity-75">
          {display.pending_review > 0
            ? `Score provisoire — ${display.pending_review} réponse(s) en attente de révision`
            : 'Score final'}
        </div>
      </div>

      {/* ── Summary stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Questions" value={`${display.total_questions}`} />
        <StatCard label="Correctes" value={`${correctCount}`} sub={`${display.total_questions > 0 ? Math.round(correctCount / display.total_questions * 100) : 0}%`} />
        <StatCard label="Incorrectes" value={`${incorrectCount}`} />
        <StatCard label="En attente" value={`${display.pending_review}`} />
      </div>

      {/* ── Performance bar ─────────────────────────────────────────────────── */}
      <PerformanceBar score={display.score} classAverage={display.class_average} />

      {/* ── Feedback section ────────────────────────────────────────────────── */}
      {!display.feedback_generated && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 flex items-center justify-between gap-4 print:hidden">
          <div>
            <p className="text-sm font-semibold text-indigo-800">Feedback personnalisé disponible</p>
            <p className="text-xs text-indigo-600 mt-0.5">
              Recevez un feedback détaillé pour chaque question avec des suggestions d&apos;amélioration.
            </p>
          </div>
          <button
            onClick={handleGenerateFeedback}
            disabled={feedbackMutation.isPending || feedbackRequested}
            className="flex-shrink-0 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {feedbackMutation.isPending
              ? 'Envoi…'
              : feedbackRequested
              ? 'Génération en cours…'
              : 'Générer le feedback'}
          </button>
        </div>
      )}

      {display.feedback_generated && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 flex items-center gap-2 text-sm text-green-700 print:hidden">
          <span>✓</span>
          <span>Feedback personnalisé généré — développez chaque question pour le voir.</span>
        </div>
      )}

      {/* ── Questions list ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">
          Détail par question
        </h2>
        <div className="space-y-3">
          {display.questions.map((q, i) => (
            <QuestionCard key={q.question_id} q={q} index={i + 1} />
          ))}
        </div>
      </div>

      {/* ── Footer actions ──────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-2 print:hidden">
        <button
          onClick={() => router.push('/dashboard/student/quiz-history')}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Voir l&apos;historique
        </button>
        <button
          onClick={() => router.push(`/dashboard/student/quizzes/${display.quiz_id}`)}
          className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Revoir le quiz
        </button>
      </div>

      {/* ── Cost footer (tokens) ────────────────────────────────────────────── */}
      {display.total_tokens_used > 0 && (
        <p className="text-xs text-gray-300 text-center print:hidden">
          {display.total_tokens_used.toLocaleString()} tokens LLM utilisés pour la correction et le feedback
        </p>
      )}
    </div>
  );
}
