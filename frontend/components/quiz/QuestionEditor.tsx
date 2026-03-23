'use client';

import { Trash2, Plus } from 'lucide-react';
import { nanoid } from './utils';
import type { LocalQuestion, LocalAnswer, QuestionType } from '@/types/quiz';

interface Props {
  question: LocalQuestion;
  index: number;
  onChange: (updated: LocalQuestion) => void;
  onDelete: () => void;
}

const EMPTY_ANSWER = (): LocalAnswer => ({
  localId: nanoid(),
  text: '',
  is_correct: false,
  order: 0,
});

const TRUE_FALSE_ANSWERS: LocalAnswer[] = [
  { localId: 'tf-true', text: 'Vrai', is_correct: true, order: 0 },
  { localId: 'tf-false', text: 'Faux', is_correct: false, order: 1 },
];

export function QuestionEditor({ question, index, onChange, onDelete }: Props) {
  const isTF = question.type === 'TrueFalse';

  function setField<K extends keyof LocalQuestion>(key: K, value: LocalQuestion[K]) {
    onChange({ ...question, [key]: value });
  }

  function handleTypeChange(type: QuestionType) {
    if (type === 'TrueFalse') {
      onChange({ ...question, type, answers: TRUE_FALSE_ANSWERS.map((a) => ({ ...a })) });
    } else {
      const answers =
        question.type === 'TrueFalse'
          ? [EMPTY_ANSWER(), EMPTY_ANSWER(), EMPTY_ANSWER(), EMPTY_ANSWER()]
          : question.answers;
      onChange({ ...question, type, answers });
    }
  }

  function updateAnswer(localId: string, patch: Partial<LocalAnswer>) {
    setField(
      'answers',
      question.answers.map((a) => (a.localId === localId ? { ...a, ...patch } : a))
    );
  }

  function setCorrect(localId: string) {
    setField(
      'answers',
      question.answers.map((a) => ({ ...a, is_correct: a.localId === localId }))
    );
  }

  function addAnswer() {
    const next: LocalAnswer = { ...EMPTY_ANSWER(), order: question.answers.length };
    setField('answers', [...question.answers, next]);
  }

  function removeAnswer(localId: string) {
    setField(
      'answers',
      question.answers.filter((a) => a.localId !== localId).map((a, i) => ({ ...a, order: i }))
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-400">Question {index + 1}</span>
        <div className="flex items-center gap-2">
          {/* Type selector */}
          <select
            value={question.type}
            onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
            className="text-xs bg-gray-700 border border-gray-600 text-gray-200 rounded px-2 py-1 focus:outline-none focus:border-primary-500"
          >
            <option value="MCQ">QCM</option>
            <option value="TrueFalse">Vrai / Faux</option>
          </select>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-400 transition-colors rounded"
            title="Supprimer la question"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Question text */}
      <textarea
        value={question.text}
        onChange={(e) => setField('text', e.target.value)}
        placeholder="Texte de la question…"
        rows={2}
        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 resize-none"
      />

      {/* Answers */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500">
          {isTF ? 'Sélectionner la bonne réponse :' : 'Réponses (cocher la bonne) :'}
        </p>
        {question.answers.map((answer) => (
          <div key={answer.localId} className="flex items-center gap-2">
            <input
              type="radio"
              name={`correct-${question.localId}`}
              checked={answer.is_correct}
              onChange={() => setCorrect(answer.localId)}
              className="accent-primary-500 flex-shrink-0"
            />
            {isTF ? (
              <span className="text-sm text-gray-200 flex-1">{answer.text}</span>
            ) : (
              <input
                type="text"
                value={answer.text}
                onChange={(e) => updateAnswer(answer.localId, { text: e.target.value })}
                placeholder={`Réponse ${answer.order + 1}…`}
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500"
              />
            )}
            {!isTF && question.answers.length > 2 && (
              <button
                onClick={() => removeAnswer(answer.localId)}
                className="p-1 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}

        {!isTF && question.answers.length < 6 && (
          <button
            onClick={addAnswer}
            className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            <Plus size={13} />
            Ajouter une réponse
          </button>
        )}
      </div>
    </div>
  );
}
