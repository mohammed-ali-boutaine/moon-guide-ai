'use client';

import { CheckCircle, Clock, RotateCcw, X } from 'lucide-react';
import type { LocalQuestion, QuizFormData } from '@/types/quiz';

interface Props {
  form: QuizFormData;
  questions: LocalQuestion[];
  onClose: () => void;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile',
};

export function QuizPreview({ form, questions, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-100">Aperçu du quiz</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Quiz meta */}
          <div className="bg-gray-800 rounded-lg p-5 space-y-2">
            <h3 className="text-xl font-bold text-gray-100">{form.title || 'Sans titre'}</h3>
            {form.description && <p className="text-sm text-gray-400">{form.description}</p>}
            <div className="flex flex-wrap gap-4 pt-1 text-sm text-gray-400">
              {form.difficulty && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary-500 inline-block" />
                  {DIFFICULTY_LABEL[form.difficulty]}
                </span>
              )}
              {form.duration_minutes && (
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {form.duration_minutes} min
                </span>
              )}
              {form.max_attempts && (
                <span className="flex items-center gap-1">
                  <RotateCcw size={14} />
                  {form.max_attempts} tentative{Number(form.max_attempts) > 1 ? 's' : ''}
                </span>
              )}
              <span className="flex items-center gap-1">
                {questions.length} question{questions.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Questions */}
          {questions.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Aucune question ajoutée.</p>
          ) : (
            questions.map((q, qi) => (
              <div key={q.localId} className="space-y-3">
                <p className="text-sm font-medium text-gray-200">
                  <span className="text-primary-400 mr-2">{qi + 1}.</span>
                  {q.text || <span className="italic text-gray-500">Question vide</span>}
                </p>
                <ul className="space-y-1.5 pl-4">
                  {q.answers.map((a) => (
                    <li
                      key={a.localId}
                      className={`flex items-center gap-2 text-sm rounded px-3 py-2 ${
                        a.is_correct
                          ? 'bg-green-900/30 border border-green-700/50 text-green-300'
                          : 'bg-gray-800 border border-gray-700 text-gray-400'
                      }`}
                    >
                      {a.is_correct && <CheckCircle size={13} className="text-green-400 flex-shrink-0" />}
                      {a.text || <span className="italic">Réponse vide</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm transition-colors"
          >
            Fermer l'aperçu
          </button>
        </div>
      </div>
    </div>
  );
}
