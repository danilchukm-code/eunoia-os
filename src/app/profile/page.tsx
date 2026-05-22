'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Onboarding data
  const [occupation, setOccupation] = useState('');
  const [goal, setGoal] = useState('');
  const [communicationStyle, setCommunicationStyle] = useState('');

  useEffect(() => {
    // Load user data
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          setName(d.user.name);
          setEmail(d.user.email);
        }
      })
      .catch(() => {});

    // Load onboarding data
    fetch('/api/onboarding', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.onboarding) {
          setOccupation(d.onboarding.occupation || '');
          setGoal(d.onboarding.goal || '');
          setCommunicationStyle(d.onboarding.communication_style || '');
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, oldPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Профиль обновлён');
        setOldPassword('');
        setNewPassword('');
      } else {
        setMessage(data.error || 'Ошибка');
      }
    } catch {
      setMessage('Ошибка соединения');
    }
    setSaving(false);
  };

  const handleSaveOnboarding = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          occupation,
          goal,
          communication_style: communicationStyle,
        }),
      });
      if (res.ok) {
        setMessage('Ответы обновлены');
      } else {
        setMessage('Ошибка сохранения');
      }
    } catch {
      setMessage('Ошибка соединения');
    }
    setSaving(false);
  };

  const handleRegenerateSkills = async () => {
    if (!occupation || !goal || !communicationStyle) {
      setMessage('Сначала заполните ответы онбординга');
      return;
    }
    setSaving(true);
    setMessage('Генерируем скиллы...');
    try {
      // Save onboarding first
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          occupation,
          goal,
          communication_style: communicationStyle,
        }),
      });
      // Generate skills
      const res = await fetch('/api/skills/generate', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        setMessage('Новые скиллы созданы!');
      } else {
        setMessage('Ошибка генерации');
      }
    } catch {
      setMessage('Ошибка соединения');
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-[#1a1714] text-[#e8e2d8] p-6">
      <div className="max-w-lg mx-auto">
        <button onClick={() => router.back()} className="text-white/50 text-sm mb-8 hover:text-white transition-colors">
          ← Назад
        </button>

        <h1 className="text-2xl font-light mb-8">Профиль</h1>

        {message && (
          <div className="mb-6 p-3 rounded-lg bg-white/5 text-sm">{message}</div>
        )}

        {/* Profile section */}
        <div className="mb-10">
          <h2 className="text-sm text-white/50 uppercase tracking-wider mb-4">Аккаунт</h2>

          <label className="block text-sm text-white/50 mb-1">Имя</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white mb-4 outline-none focus:border-white/30"
          />

          <label className="block text-sm text-white/50 mb-1">Email</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white/50 mb-4 outline-none cursor-not-allowed"
          />

          <label className="block text-sm text-white/50 mb-1">Старый пароль</label>
          <input
            type="password"
            value={oldPassword}
            onChange={e => setOldPassword(e.target.value)}
            placeholder="Оставьте пустым если не меняете"
            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white mb-4 outline-none focus:border-white/30 placeholder:text-white/20"
          />

          <label className="block text-sm text-white/50 mb-1">Новый пароль</label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Минимум 6 символов"
            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white mb-6 outline-none focus:border-white/30 placeholder:text-white/20"
          />

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full py-3 rounded-lg bg-white/10 text-white hover:bg-white/15 transition-colors disabled:opacity-50"
          >
            {saving ? 'Сохраняю...' : 'Сохранить профиль'}
          </button>
        </div>

        {/* Onboarding section */}
        <div className="mb-10">
          <h2 className="text-sm text-white/50 uppercase tracking-wider mb-4">Онбординг</h2>
          <p className="text-sm text-white/30 mb-4">Измените ответы и перегенерируйте скиллы</p>

          <label className="block text-sm text-white/50 mb-1">Чем ты занимаешься?</label>
          <textarea
            value={occupation}
            onChange={e => setOccupation(e.target.value)}
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white mb-4 outline-none focus:border-white/30 resize-none"
          />

          <label className="block text-sm text-white/50 mb-1">Что для тебя сейчас самое важное?</label>
          <textarea
            value={goal}
            onChange={e => setGoal(e.target.value)}
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white mb-4 outline-none focus:border-white/30 resize-none"
          />

          <label className="block text-sm text-white/50 mb-1">Как тебе удобнее общаться?</label>
          <textarea
            value={communicationStyle}
            onChange={e => setCommunicationStyle(e.target.value)}
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white mb-6 outline-none focus:border-white/30 resize-none"
          />

          <div className="flex gap-3">
            <button
              onClick={handleSaveOnboarding}
              disabled={saving}
              className="flex-1 py-3 rounded-lg bg-white/10 text-white hover:bg-white/15 transition-colors disabled:opacity-50"
            >
              Сохранить ответы
            </button>
            <button
              onClick={handleRegenerateSkills}
              disabled={saving}
              className="flex-1 py-3 rounded-lg bg-[#c4a96a]/20 text-[#c4a96a] hover:bg-[#c4a96a]/30 transition-colors disabled:opacity-50"
            >
              ✨ Перегенерировать скиллы
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
