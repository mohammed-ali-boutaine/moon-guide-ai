'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { apiClient } from '@/lib/api-client';

// ── Types ───────────────────────────────────────────────────────────────────

interface CareerPrediction {
  label: string;
  confidence: number;
}

interface PredictionResponse {
  top_prediction: string;
  recommendations: CareerPrediction[];
}

interface ProfileForm {
  skills: string[];
  interests: string[];
  math: number;
  sciences: number;
  languages: number;
  arts: number;
  projects: string[];
  salary_expectation: string;
  remote_preference: string;
  target_field: string;
}

// ── Career icons & colors ───────────────────────────────────────────────────

const careerMeta: Record<string, { color: string; bg: string; icon: string }> = {
  'Software Engineering': { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: '💻' },
  'Data Science':         { color: 'text-green-400', bg: 'bg-green-500/20', icon: '📊' },
  'AI/ML':                { color: 'text-purple-400', bg: 'bg-purple-500/20', icon: '🤖' },
  'Web Development':      { color: 'text-orange-400', bg: 'bg-orange-500/20', icon: '🌐' },
  'Business Analytics':   { color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: '📈' },
  'UX/UI Design':         { color: 'text-pink-400', bg: 'bg-pink-500/20', icon: '🎨' },
};

// ── Skill / Interest suggestions ────────────────────────────────────────────

const skillSuggestions = [
  'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'Java',
  'C++', 'TensorFlow', 'PyTorch', 'Docker', 'Git', 'AWS', 'Figma',
  'Tableau', 'Power BI', 'Excel', 'R', 'Pandas', 'scikit-learn',
  'HTML/CSS', 'MongoDB', 'PostgreSQL', 'Kubernetes', 'Go', 'Rust',
  'Swift', 'Kotlin', 'Flutter', 'GraphQL', 'Redis', 'Linux',
];

const interestSuggestions = [
  'Machine Learning', 'Web Apps', 'Mobile Apps', 'Data Visualization',
  'Cloud Computing', 'Cybersecurity', 'Game Development', 'DevOps',
  'UI/UX Design', 'Blockchain', 'IoT', 'NLP', 'Computer Vision',
  'Open Source', 'Startups', 'Research', 'Automation', 'APIs',
];

// ── Tag input component ─────────────────────────────────────────────────────

function TagInput({
  label,
  tags,
  setTags,
  suggestions,
  placeholder,
}: {
  label: string;
  tags: string[];
  setTags: (t: string[]) => void;
  suggestions: string[];
  placeholder: string;
}) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setInput('');
    setShowSuggestions(false);
  };

  const removeTag = (idx: number) => setTags(tags.filter((_, i) => i !== idx));

  const filtered = suggestions.filter(
    (s) => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
  );

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-primary-600/20 text-primary-300 border border-primary-600/30"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="ml-1 hover:text-red-400"
            >
              x
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (input.trim()) addTag(input);
            }
          }}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-gray-200 placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
        />
        {showSuggestions && input && filtered.length > 0 && (
          <div className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-gray-700 bg-gray-800 shadow-lg">
            {filtered.slice(0, 8).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addTag(s)}
                className="block w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Score slider ────────────────────────────────────────────────────────────

function ScoreSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        <span className="text-sm font-bold text-primary-400">{value}/20</span>
      </div>
      <input
        type="range"
        min={0}
        max={20}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-700 accent-primary-500"
      />
    </div>
  );
}

// ── Results display ─────────────────────────────────────────────────────────

function ResultsDisplay({ result }: { result: PredictionResponse }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top prediction */}
      <div className="text-center p-8 rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-800/80 to-gray-900/80">
        <p className="text-sm uppercase tracking-wider text-gray-400 mb-2">
          Your Top Career Match
        </p>
        <div className="text-6xl mb-3">
          {careerMeta[result.top_prediction]?.icon || '🎯'}
        </div>
        <h2 className={`text-3xl font-bold ${careerMeta[result.top_prediction]?.color || 'text-white'}`}>
          {result.top_prediction}
        </h2>
        <p className="text-lg text-gray-400 mt-2">
          {result.recommendations[0]?.confidence.toFixed(1)}% confidence
        </p>
      </div>

      {/* All recommendations */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-200">Top 3 Recommendations</h3>
        {result.recommendations.map((rec, i) => {
          const meta = careerMeta[rec.label] || { color: 'text-gray-300', bg: 'bg-gray-500/20', icon: '📌' };
          return (
            <div
              key={rec.label}
              className={`flex items-center gap-4 p-4 rounded-xl border border-gray-700 ${meta.bg}`}
            >
              <div className="text-3xl">{meta.icon}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-semibold ${meta.color}`}>
                    {i + 1}. {rec.label}
                  </span>
                  <span className="text-sm font-bold text-gray-300">
                    {rec.confidence.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-700 ${
                      i === 0 ? 'bg-primary-500' : i === 1 ? 'bg-primary-500/60' : 'bg-primary-500/30'
                    }`}
                    style={{ width: `${rec.confidence}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

function CareerContent() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PredictionResponse | null>(null);

  const [form, setForm] = useState<ProfileForm>({
    skills: [],
    interests: [],
    math: 10,
    sciences: 10,
    languages: 10,
    arts: 10,
    projects: [''],
    salary_expectation: '40000',
    remote_preference: 'hybrid',
    target_field: '',
  });

  const updateForm = (updates: Partial<ProfileForm>) =>
    setForm((prev) => ({ ...prev, ...updates }));

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        skills: form.skills,
        interests: form.interests,
        academic_performance: {
          math: form.math,
          sciences: form.sciences,
          languages: form.languages,
          arts: form.arts,
        },
        projects: form.projects.filter((p) => p.trim()),
        goals: {
          salary_expectation: form.salary_expectation,
          remote_preference: form.remote_preference,
          target_field: form.target_field,
        },
      };
      const data = await apiClient.post<PredictionResponse>(
        '/api/career/predict',
        payload
      );
      setResult(data);
      setStep(4);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Prediction failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return form.skills.length >= 1 && form.interests.length >= 1;
    if (step === 2) return true;
    if (step === 3) return form.target_field.trim().length > 0;
    return true;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Career Orientation</h1>
          <p className="text-gray-400">
            Fill in your profile and our AI will suggest the best career path for you
          </p>
        </div>

        {/* Progress bar */}
        {step < 4 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              {['Skills & Interests', 'Academic Scores', 'Goals & Projects'].map(
                (label, i) => (
                  <div
                    key={label}
                    className={`text-xs font-medium ${
                      step > i + 1
                        ? 'text-primary-400'
                        : step === i + 1
                        ? 'text-white'
                        : 'text-gray-500'
                    }`}
                  >
                    {label}
                  </div>
                )
              )}
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Step 1: Skills & Interests */}
        {step === 1 && (
          <div className="space-y-6 bg-gray-900 border border-gray-800 rounded-xl p-6">
            <TagInput
              label="Your Skills (min 1)"
              tags={form.skills}
              setTags={(t) => updateForm({ skills: t })}
              suggestions={skillSuggestions}
              placeholder="Type a skill or select from suggestions..."
            />
            <TagInput
              label="Your Interests (min 1)"
              tags={form.interests}
              setTags={(t) => updateForm({ interests: t })}
              suggestions={interestSuggestions}
              placeholder="Type an interest or select from suggestions..."
            />
          </div>
        )}

        {/* Step 2: Academic Scores */}
        {step === 2 && (
          <div className="space-y-6 bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">
              Academic Performance (0-20 scale)
            </h3>
            <ScoreSlider
              label="Mathematics"
              value={form.math}
              onChange={(v) => updateForm({ math: v })}
            />
            <ScoreSlider
              label="Sciences"
              value={form.sciences}
              onChange={(v) => updateForm({ sciences: v })}
            />
            <ScoreSlider
              label="Languages"
              value={form.languages}
              onChange={(v) => updateForm({ languages: v })}
            />
            <ScoreSlider
              label="Arts"
              value={form.arts}
              onChange={(v) => updateForm({ arts: v })}
            />
          </div>
        )}

        {/* Step 3: Goals & Projects */}
        {step === 3 && (
          <div className="space-y-6 bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target Field
              </label>
              <input
                type="text"
                value={form.target_field}
                onChange={(e) => updateForm({ target_field: e.target.value })}
                placeholder="e.g. fintech, healthcare, gaming, education..."
                className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-gray-200 placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Salary Expectation ($/year)
              </label>
              <select
                value={form.salary_expectation}
                onChange={(e) => updateForm({ salary_expectation: e.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-gray-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
              >
                <option value="25000">$25,000</option>
                <option value="35000">$35,000</option>
                <option value="45000">$45,000</option>
                <option value="60000">$60,000</option>
                <option value="80000">$80,000</option>
                <option value="100000">$100,000+</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Work Preference
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['remote', 'hybrid', 'on-site'].map((pref) => (
                  <button
                    key={pref}
                    type="button"
                    onClick={() => updateForm({ remote_preference: pref })}
                    className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      form.remote_preference === pref
                        ? 'border-primary-500 bg-primary-500/20 text-primary-300'
                        : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {pref.charAt(0).toUpperCase() + pref.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Projects (describe 1-3 projects you&apos;ve worked on)
              </label>
              {form.projects.map((proj, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={proj}
                    onChange={(e) => {
                      const updated = [...form.projects];
                      updated[i] = e.target.value;
                      updateForm({ projects: updated });
                    }}
                    placeholder={`Project ${i + 1} description...`}
                    className="flex-1 rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-gray-200 placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  />
                  {form.projects.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        updateForm({
                          projects: form.projects.filter((_, idx) => idx !== i),
                        })
                      }
                      className="px-3 py-2 text-red-400 hover:text-red-300"
                    >
                      x
                    </button>
                  )}
                </div>
              ))}
              {form.projects.length < 3 && (
                <button
                  type="button"
                  onClick={() => updateForm({ projects: [...form.projects, ''] })}
                  className="text-sm text-primary-400 hover:text-primary-300 mt-1"
                >
                  + Add another project
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 4 && result && <ResultsDisplay result={result} />}

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          {step > 1 && step < 4 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-6 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
            >
              Back
            </button>
          )}
          {step === 4 && (
            <button
              onClick={() => {
                setStep(1);
                setResult(null);
                setError('');
              }}
              className="px-6 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
            >
              Start Over
            </button>
          )}

          {step < 3 && (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="ml-auto px-6 py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          )}
          {step === 3 && (
            <button
              onClick={handleSubmit}
              disabled={!canProceed() || loading}
              className="ml-auto px-8 py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Analyzing...
                </>
              ) : (
                'Get My Career Match'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CareerPage() {
  return (
    <ProtectedRoute>
      <CareerContent />
    </ProtectedRoute>
  );
}
