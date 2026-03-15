'use client';

import { useRef, useState } from 'react';
import { GripVertical, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { QuestionEditor } from './QuestionEditor';
import { nanoid } from './utils';
import type { LocalQuestion } from '@/types/quiz';

interface Props {
  questions: LocalQuestion[];
  onChange: (questions: LocalQuestion[]) => void;
}

function buildEmptyQuestion(order: number): LocalQuestion {
  return {
    localId: nanoid(),
    type: 'MCQ',
    text: '',
    order,
    answers: [
      { localId: nanoid(), text: '', is_correct: true, order: 0 },
      { localId: nanoid(), text: '', is_correct: false, order: 1 },
      { localId: nanoid(), text: '', is_correct: false, order: 2 },
      { localId: nanoid(), text: '', is_correct: false, order: 3 },
    ],
  };
}

export function QuestionList({ questions, onChange }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Native drag-and-drop state
  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function toggleExpand(localId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(localId) ? next.delete(localId) : next.add(localId);
      return next;
    });
  }

  function addQuestion() {
    const newQ = buildEmptyQuestion(questions.length);
    const next = [...questions, newQ];
    onChange(next);
    setExpanded((prev) => new Set(prev).add(newQ.localId));
  }

  function updateQuestion(index: number, updated: LocalQuestion) {
    const next = [...questions];
    next[index] = updated;
    onChange(next);
  }

  function deleteQuestion(index: number) {
    const next = questions.filter((_, i) => i !== index).map((q, i) => ({ ...q, order: i }));
    onChange(next);
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...questions];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next.map((q, i) => ({ ...q, order: i })));
  }

  function moveDown(index: number) {
    if (index === questions.length - 1) return;
    const next = [...questions];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next.map((q, i) => ({ ...q, order: i })));
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────
  function handleDragStart(index: number) {
    dragIndex.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(index: number) {
    const from = dragIndex.current;
    if (from === null || from === index) {
      dragIndex.current = null;
      setDragOverIndex(null);
      return;
    }
    const next = [...questions];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    onChange(next.map((q, i) => ({ ...q, order: i })));
    dragIndex.current = null;
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    dragIndex.current = null;
    setDragOverIndex(null);
  }

  return (
    <div className="space-y-3">
      {questions.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-6 border border-dashed border-gray-700 rounded-lg">
          Aucune question. Ajoutez-en une ci-dessous.
        </p>
      )}

      {questions.map((q, index) => (
        <div
          key={q.localId}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={() => handleDrop(index)}
          onDragEnd={handleDragEnd}
          className={`rounded-lg border transition-colors ${
            dragOverIndex === index
              ? 'border-primary-500 bg-primary-950/20'
              : 'border-gray-700 bg-gray-900'
          }`}
        >
          {/* Question row header */}
          <div className="flex items-center gap-2 px-3 py-2">
            {/* Drag handle */}
            <GripVertical
              size={16}
              className="text-gray-600 cursor-grab flex-shrink-0"
            />

            {/* Question preview text */}
            <button
              onClick={() => toggleExpand(q.localId)}
              className="flex-1 text-left text-sm text-gray-200 truncate"
            >
              {q.text || <span className="text-gray-500 italic">Question {index + 1} (vide)</span>}
            </button>

            {/* Reorder buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => moveUp(index)}
                disabled={index === 0}
                className="p-1 text-gray-500 hover:text-gray-300 disabled:opacity-30 transition-colors"
                title="Monter"
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={() => moveDown(index)}
                disabled={index === questions.length - 1}
                className="p-1 text-gray-500 hover:text-gray-300 disabled:opacity-30 transition-colors"
                title="Descendre"
              >
                <ChevronDown size={14} />
              </button>
              <button
                onClick={() => toggleExpand(q.localId)}
                className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {expanded.has(q.localId) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>

          {/* Expanded editor */}
          {expanded.has(q.localId) && (
            <div className="px-3 pb-3">
              <QuestionEditor
                question={q}
                index={index}
                onChange={(updated) => updateQuestion(index, updated)}
                onDelete={() => deleteQuestion(index)}
              />
            </div>
          )}
        </div>
      ))}

      <button
        onClick={addQuestion}
        className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-primary-400 hover:text-primary-300 border border-dashed border-primary-700 hover:border-primary-500 rounded-lg transition-colors"
      >
        <Plus size={15} />
        Ajouter une question
      </button>
    </div>
  );
}
