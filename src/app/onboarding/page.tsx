'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const QUESTIONS = [
  {
    key: 'occupation' as const,
    question: 'Чем ты занимаешься?',
    placeholder: 'Например: пишу книгу, учусь, работаю в маркетинге...',
    icon: '💼',
  },
  {
    key: 'goal' as const,
    question: 'Что для тебя сейчас самое важное?',
    placeholder: 'Например: закончить проект, найти себя, развить бизнес...',
    icon: '🎯',
  },
  {
    key: 'communication_style' as const,
    question: 'Как тебе удобнее общаться?',
    placeholder: 'Например: коротко и по делу, с примерами, развёрнуто...',
    icon: '💬',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ occupation: '', goal: '', communication_style: '' });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Check if already completed
    fetch('/api/onboarding', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.onboarding?.generated_skills) {
          router.push('/');
        }
      })
      .catch(() => {});
  }, [router]);

  const current = QUESTIONS[step];
  const value = answers[current.key];

  const handleNext = () => {
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Save onboarding answers
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(answers),
      });
      if (!res.ok) throw new Error('Failed to save');

      // Generate skills
      setGenerating(true);
      const genRes = await fetch('/api/skills/generate', {
        method: 'POST',
        credentials: 'include',
      });
      if (!genRes.ok) throw new Error('Failed to generate skills');

      setDone(true);
      setTimeout(() => router.push('/'), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">✨</div>
          <h1 className="text-2xl font-light mb-3">Твои скиллы готовы</h1>
          <p className="text-white/50 text-sm">Перенаправляем тебя...</p>
        </div>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-pulse">🧠</div>
          <h1 className="text-2xl font-light mb-3">Создаём твои скиллы</h1>
          <p className="text-white/50 text-sm">ИИ подбирает навыки специально для тебя...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex gap-2 mb-12">
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-white' : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Question */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-6">{current.icon}</div>
          <h2 className="text-2xl font-light mb-3">{current.question}</h2>
        </div>

        {/* Input */}
        <textarea
          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none text-base"
          rows={3}
          placeholder={current.placeholder}
          value={value}
          onChange={e => setAnswers({ ...answers, [current.key]: e.target.value })}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && value.trim()) {
              e.preventDefault();
              handleNext();
            }
          }}
          autoFocus
        />

        {/* Button */}
        <button
          onClick={handleNext}
          disabled={!value.trim() || loading}
          className="mt-6 w-full py-3 rounded-xl bg-white text-black font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 transition-colors"
        >
          {step < QUESTIONS.length - 1 ? 'Далее' : loading ? 'Сохраняю...' : 'Создать мои скиллы'}
        </button>

        {/* Skip */}
        <button
          onClick={() => router.push('/')}
          className="mt-3 w-full py-2 text-white/30 text-sm hover:text-white/50 transition-colors"
        >
          Пропустить
        </button>
      </div>
    </div>
  );
}
