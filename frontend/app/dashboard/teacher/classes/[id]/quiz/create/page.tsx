'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Eye,
  Loader2,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth';
import { QuestionList, QuizPreview } from '@/components/quiz';
import { useClassDocuments } from '@/hooks/use-documents';
import {
  useCreateQuiz,
  useGenerateQuiz,
  useQuiz,
  useQuizJob,
  useUpdateQuiz,
} from '@/hooks/use-quiz';
import { nanoid } from '@/components/quiz/utils';
import type { LocalQuestion, QuizDifficulty, QuizFormData } from '@/types/quiz';

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_FORM: QuizFormData = {
  title: '',
  description: '',
  duration_minutes: '',
  max_attempts: '',
  difficulty: 'medium',
};

type Tab = 'manual' | 'auto';

// ── Page wrapper ──────────────────────────────────────────────────────────────

export default function QuizCreatePage() {
  return (
    <ProtectedRoute allowedRoles={['TEACHER']}>
      <QuizCreateContent />
    </ProtectedRoute>
  );
}

// ── Main content ──────────────────────────────────────────────────────────────

function QuizCreateContent() {
  const params = useParams();
  const classId = params.id as string;
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('auto');
  const [form, setForm] = useState<QuizFormData>(DEFAULT_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof QuizFormData, string>>>({});
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Auto-generate state
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [numQuestions, setNumQuestions] = useState(10);
  const [jobId, setJobId] = useState<string | null>(null);
  const [generatedQuizId, setGeneratedQuizId] = useState<number | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // ── API hooks ──────────────────────────────────────────────────────────────
  const { data: docsData } = useClassDocuments(classId);
  const readyDocs = (docsData?.documents ?? []).filter((d) => d.status === 'ready');

  const generateMutation = useGenerateQuiz();
  const { data: jobData } = useQuizJob(jobId);
  const { data: generatedQuiz } = useQuiz(generatedQuizId);
  const createMutation = useCreateQuiz();
  const updateMutation = useUpdateQuiz(generatedQuizId);

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isGenerating = generateMutation.isPending || (!!jobId && jobData?.status === 'processing') || (!!jobId && jobData?.status === 'pending');

  // ── Effect: when job completes, load the quiz ──────────────────────────────
  useEffect(() => {
    if (jobData?.status === 'completed' && jobData.quiz_id) {
      setGeneratedQuizId(jobData.quiz_id);
      setJobId(null);
    } else if (jobData?.status === 'failed') {
      setGenerateError(jobData.error_message ?? 'La génération a échoué.');
      setJobId(null);
    }
  }, [jobData]);

  // ── Effect: when generated quiz loads, populate questions + form ───────────
  useEffect(() => {
    if (!generatedQuiz) return;
    setForm((prev) => ({
      ...prev,
      title: prev.title || generatedQuiz.title,
      difficulty: (generatedQuiz.difficulty as QuizDifficulty) ?? prev.difficulty,
    }));
    setQuestions(
      generatedQuiz.questions.map((q) => ({
        localId: nanoid(),
        id: q.id,
        type: q.type,
        text: q.text,
        order: q.order,
        answers: q.answers.map((a) => ({
          localId: nanoid(),
          id: a.id,
          text: a.text,
          is_correct: a.is_correct,
          order: a.order,
        })),
      }))
    );
  }, [generatedQuiz]);

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate(): boolean {
    const errors: Partial<Record<keyof QuizFormData, string>> = {};
    if (!form.title.trim()) errors.title = 'Le titre est requis.';
    if (form.duration_minutes && Number(form.duration_minutes) < 1)
      errors.duration_minutes = 'Durée invalide.';
    if (form.max_attempts && Number(form.max_attempts) < 1)
      errors.max_attempts = 'Nombre de tentatives invalide.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleGenerate() {
    if (!selectedDocId) return;
    setGenerateError(null);
    try {
      const job = await generateMutation.mutateAsync({
        document_id: selectedDocId,
        num_questions: numQuestions,
        difficulty: form.difficulty,
      });
      setJobId(job.job_id);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Erreur de génération.');
    }
  }

  async function handleSave(publish: boolean) {
    if (!validate()) return;

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      difficulty: form.difficulty,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : undefined,
      max_attempts: form.max_attempts ? Number(form.max_attempts) : undefined,
    };

    try {
      if (generatedQuizId) {
        // Auto-generate path: quiz already exists, just update metadata + status
        await updateMutation.mutateAsync({
          ...payload,
          status: publish ? 'published' : 'draft',
        });
      } else {
        // Manual path: create quiz from scratch
        await createMutation.mutateAsync({
          ...payload,
          class_id: classId,
          questions: questions.map((q, qi) => ({
            type: q.type,
            text: q.text,
            order: qi,
            answers: q.answers.map((a, ai) => ({
              text: a.text,
              is_correct: a.is_correct,
              order: ai,
            })),
          })),
        });
      }
      router.push(`/dashboard/teacher/classes/${classId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.');
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-sm text-gray-500">
          <Link href="/dashboard/teacher" className="hover:text-gray-300 transition-colors">
            Tableau de bord
          </Link>
          <ChevronRight size={14} />
          <Link href={`/dashboard/teacher/classes/${classId}`} className="hover:text-gray-300 transition-colors">
            Classe
          </Link>
          <ChevronRight size={14} />
          <span className="text-gray-300">Créer un quiz</span>
        </nav>

        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Créer un quiz</h1>
          <p className="text-sm text-gray-500 mt-1">
            Choisissez de créer manuellement ou de générer automatiquement depuis un document.
          </p>
        </div>

        {/* ── Quiz metadata form ──────────────────────────────────────────── */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-200">Informations générales</h2>

          <div className="space-y-1">
            <label className="text-sm text-gray-400">
              Titre <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex. Révision chapitre 3"
              className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-primary-500 ${
                formErrors.title ? 'border-red-500' : 'border-gray-700'
              }`}
            />
            {formErrors.title && (
              <p className="text-xs text-red-400">{formErrors.title}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-400">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description optionnelle…"
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-primary-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm text-gray-400">Difficulté</label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value as QuizDifficulty })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-primary-500"
              >
                <option value="easy">Facile</option>
                <option value="medium">Moyen</option>
                <option value="hard">Difficile</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-gray-400">Durée (min)</label>
              <input
                type="number"
                min={1}
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                placeholder="Ex. 30"
                className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-primary-500 ${
                  formErrors.duration_minutes ? 'border-red-500' : 'border-gray-700'
                }`}
              />
              {formErrors.duration_minutes && (
                <p className="text-xs text-red-400">{formErrors.duration_minutes}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm text-gray-400">Max tentatives</label>
              <input
                type="number"
                min={1}
                value={form.max_attempts}
                onChange={(e) => setForm({ ...form, max_attempts: e.target.value })}
                placeholder="Ex. 3"
                className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-primary-500 ${
                  formErrors.max_attempts ? 'border-red-500' : 'border-gray-700'
                }`}
              />
              {formErrors.max_attempts && (
                <p className="text-xs text-red-400">{formErrors.max_attempts}</p>
              )}
            </div>
          </div>
        </section>

        {/* ── Mode tabs ───────────────────────────────────────────────────── */}
        <div className="flex rounded-lg overflow-hidden border border-gray-700">
          <button
            onClick={() => setTab('manual')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              tab === 'manual'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-900 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            <BookOpen size={16} />
            Créer manuellement
          </button>
          <button
            onClick={() => setTab('auto')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              tab === 'auto'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-900 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            <Sparkles size={16} />
            Générer automatiquement
          </button>
        </div>

        {/* ── Auto-generate panel ─────────────────────────────────────────── */}
        {tab === 'auto' && (
          <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
            <h2 className="text-base font-semibold text-gray-200">Génération automatique</h2>

            {/* Document selector */}
            <div className="space-y-1">
              <label className="text-sm text-gray-400">
                Document source <span className="text-red-400">*</span>
              </label>
              {readyDocs.length === 0 ? (
                <p className="text-sm text-yellow-500 bg-yellow-900/20 border border-yellow-800/50 rounded-lg px-3 py-2">
                  Aucun document prêt dans cette classe. Uploadez un document d'abord.
                </p>
              ) : (
                <select
                  value={selectedDocId ?? ''}
                  onChange={(e) => setSelectedDocId(Number(e.target.value) || null)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-primary-500"
                >
                  <option value="">Sélectionner un document…</option>
                  {readyDocs.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.filename}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Number of questions */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">
                Nombre de questions : <span className="text-gray-200 font-medium">{numQuestions}</span>
              </label>
              <input
                type="range"
                min={5}
                max={50}
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                className="w-full accent-primary-500"
              />
              <div className="flex justify-between text-xs text-gray-600">
                <span>5</span>
                <span>50</span>
              </div>
            </div>

            {/* Generate button */}
            {!generatedQuizId && (
              <button
                onClick={handleGenerate}
                disabled={!selectedDocId || isGenerating}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Génération en cours…
                  </>
                ) : (
                  <>
                    <Wand2 size={16} />
                    Générer les questions
                  </>
                )}
              </button>
            )}

            {/* Generation progress */}
            {isGenerating && (
              <div className="flex items-center gap-3 text-sm text-gray-400 bg-gray-800 rounded-lg px-4 py-3">
                <Loader2 size={16} className="animate-spin text-primary-400 flex-shrink-0" />
                <span>
                  Analyse du document et génération des questions avec l'IA… Cette opération peut
                  prendre 30 à 60 secondes.
                </span>
              </div>
            )}

            {/* Generation success */}
            {generatedQuizId && (
              <div className="flex items-center gap-2 text-sm text-green-400 bg-green-900/20 border border-green-800/50 rounded-lg px-4 py-3">
                <CheckCircle2 size={16} className="flex-shrink-0" />
                {questions.length} questions générées. Modifiez-les ci-dessous si nécessaire.
              </div>
            )}

            {/* Error */}
            {generateError && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg px-4 py-3">
                <AlertCircle size={16} className="flex-shrink-0" />
                {generateError}
              </div>
            )}
          </section>
        )}

        {/* ── Questions section (shared between both tabs) ────────────────── */}
        {(tab === 'manual' || questions.length > 0) && (
          <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-200">
                Questions{' '}
                {questions.length > 0 && (
                  <span className="ml-1 text-sm text-gray-500">({questions.length})</span>
                )}
              </h2>
            </div>
            <QuestionList questions={questions} onChange={setQuestions} />
          </section>
        )}

        {/* ── Action bar ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 pt-2 pb-8">
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 border border-gray-700 hover:border-gray-500 hover:text-gray-100 rounded-lg transition-colors"
          >
            <Eye size={15} />
            Aperçu
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 rounded-lg transition-colors"
            >
              {isSaving ? <Loader2 size={15} className="animate-spin" /> : null}
              Enregistrer (brouillon)
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
            >
              {isSaving ? <Loader2 size={15} className="animate-spin" /> : null}
              Publier le quiz
            </button>
          </div>
        </div>
      </main>

      {/* Preview modal */}
      {showPreview && (
        <QuizPreview
          form={form}
          questions={questions}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
