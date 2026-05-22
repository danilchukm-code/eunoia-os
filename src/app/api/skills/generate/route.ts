import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import db, { getOnboarding, markSkillsGenerated, saveSkill } from '@/lib/db';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'google/gemini-2.0-flash-001';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('eunoia_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const onboarding = getOnboarding(payload.userId);
    if (!onboarding) {
      return NextResponse.json({ error: 'Onboarding not completed' }, { status: 400 });
    }

    // Generate skills via OpenRouter
    const prompt = `Ты — эксперт по созданию персональных AI-ассистентов. На основе информации о пользователе создай 5 уникальных скиллов (навыков), которые будут ему полезны.

Информация о пользователе:
- Род занятий: ${onboarding.occupation}
- Главная цель: ${onboarding.goal}
- Стиль общения: ${onboarding.communication_style}

Для каждого скилла вер JSON с полями:
- id: короткий идентификатор (латиница, 3-15 символов)
- name: название на русском (2-5 слов)
- description: описание что делает скилл (1-2 предложения)
- system_prompt: детальная инструкция для ИИ (5-8 предложений, конкретно под этого пользователя)
- icon: эмодзи

Верни ТОЛЬКО JSON-массив из 5 объектов. Никакого другого текста.

Пример:
[
  {"id": "write", "name": "Писать тексты", "description": "...", "system_prompt": "...", "icon": "✍️"}
]`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'AI service error' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '[]';

    // Parse JSON from response
    let skills: Array<{ id: string; name: string; description: string; system_prompt: string; icon: string }>;
    try {
      // Extract JSON array from response (handle markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      skills = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: content }, { status: 500 });
    }

    // Save skills to DB
    for (const skill of skills) {
      saveSkill(payload.userId, skill);
    }
    markSkillsGenerated(payload.userId);

    return NextResponse.json({ ok: true, skills });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
