'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';


export default function QuizDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState(100);
  const router = useRouter();

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students/quizzes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const found = data.find((a: any) => a.quiz_id === id || a.id === id);
        setQuiz(found || null);
      } catch (e) {
        console.error('Failed to fetch quiz', e);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [id]);

  const handleSubmit = async () => {
    if (!quiz) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students/quizzes/${quiz.quiz_id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ score }),
      });
      if (res.ok) {
        router.refresh();
        alert('Submitted');
      } else {
        const txt = await res.text();
        alert('Failed: ' + txt);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!quiz) return <div className="p-6">Quiz not found or not assigned.</div>;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h2 className="text-2xl font-semibold text-gray-100 mb-4">{quiz.title}</h2>
      <p className="text-gray-400 mb-4">Assigned: {new Date(quiz.assigned_at).toLocaleString()}</p>
      <p className="text-gray-400 mb-4">Status: {quiz.status}{quiz.score !== null ? ` — ${quiz.score}%` : ''}</p>

      {/* Simple submit UI to mark quiz complete with a score */}
      {quiz.status !== 'completed' ? (
        <div className="space-y-4">
          <label className="block text-sm text-gray-300">Score</label>
          <input type="number" value={score} onChange={(e) => setScore(Number(e.target.value))} className="w-32 p-2 rounded bg-gray-800 border border-gray-700" />
          <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 bg-primary-600 text-white rounded">
            {submitting ? 'Submitting...' : 'Submit Attempt'}
          </button>
        </div>
      ) : (
        <div className="text-green-400">You completed this quiz — score: {quiz.score}%</div>
      )}
    </div>
  );
}
