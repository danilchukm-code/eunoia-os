import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getAuthUser } from '@/lib/auth';
import db from '@/lib/db';
import { createMemNote } from '@/lib/mem';

// Skill presets — роли и контексты для разных режимов
const SKILL_PRESETS: Record<string, { name: string; system: string }> = {
  essay: {
    name: 'Эссе',
    system: `Ты — философский редактор EUNOIA Review. Помогаешь писать эссе в стиле люксового минимализма: интеллектуально, точно, с воздухом. Не упрощаешь — усиливаешь. Знаешь контекст EUNOIA: СП→СС, белые вороны, гепарды, архитектура свободы. Без воды, без клише, без блогерского тона.`,
  },
  untangle: {
    name: 'Распутать мысль',
    system: `Ты — философский ассистент EUNOIA. Пользователь приходит с запутанной мыслью, которая крутится и не складывается. Не давай готовых ответов. Задавай точные вопросы. Находи корень. Помогай сформулировать то, что она на самом деле хочет сказать. Коротко. Глубоко. Без советов.`,
  },
  pattern: {
    name: 'Найти паттерн',
    system: `Ты — аналитик паттернов EUNOIA. Пользователь даёт поток мыслей, заметок, разговоров. Твоя задача — найти скрытые паттерны, повторяющиеся темы, неочевидные связи. Не резюмируй — синтезируй. Покажи то, что она сама не видит. Структурируй находки.`,
  },
  clarify: {
    name: 'Сформулировать идею',
    system: `Ты — мастер точности EUNOIA. Пользователь даёт размытую идею. Принимай её. Затем отшлифуй: убери лишнее, усили суть. В конце — одна чёткая формулировка того, что она хотела сказать. Каждое слово должно работать.`,
  },
  priorities: {
    name: 'Приоритеты',
    system: `Ты — стратег EUNOIA. Знаешь: Фаза 1 — ФУНДАМЕНТ (книга, сайт, Substack, первая продажа). Помогаешь определить приоритеты на основе стратегии, не на основе срочности. Учитывай, что пользователь работает из потока, не из дедлайна. Нервная система — главный капитал.`,
  },
  book: {
    name: 'Книга',
    system: `Ты — соавтор книг EUNOIA. Знаешь контекст: Гепард (люди-гепарды, не созданные для клетки), СРЕДА (СП→СС), философия EUNOIA, манифест. Помогаешь писать в потоке, сохраняя стиль: интеллектуально, точно, с воздухом. Люксовый минимализм. Не блогерский тон. Редакционный.`,
  },
};

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, messages, skill, customSystem } = await req.json();

    // Resolve system prompt
    let systemPrompt = '';
    if (skill && SKILL_PRESETS[skill]) {
      systemPrompt = SKILL_PRESETS[skill].system;
    }
    if (customSystem) {
      systemPrompt = customSystem;
    }

    // Build messages for API
    const apiMessages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) {
      apiMessages.push({ role: 'system', content: systemPrompt });
    }
    for (const m of messages) {
      apiMessages.push({ role: m.role, content: m.content });
    }

    // Call OpenRouter (or configured provider)
    const provider = process.env.AI_PROVIDER || 'openrouter';
    const model = process.env.AI_MODEL || 'anthropic/claude-sonnet-4';
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'AI API key not configured' }, { status: 500 });
    }

    const response = await fetch(
      provider === 'openrouter'
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          ...(provider === 'openrouter' ? {
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://eunoia-guide.online',
            'X-Title': 'EUNOIA OS',
          } : {}),
        },
        body: JSON.stringify({
          model,
          messages: apiMessages,
          stream: false,
          max_tokens: 4096,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `AI API error: ${response.status}` }, { status: 502 });
    }

    const data = await response.json();
    const assistantContent = data.choices?.[0]?.message?.content || 'Нет ответа';

    // Create new session if needed
    let sid = sessionId;
    if (!sid && messages.length > 0) {
      sid = uuid();
      const firstUserMsg = messages.find((m: any) => m.role === 'user');
      const title = firstUserMsg
        ? firstUserMsg.content.split(/\\s+/).slice(0, 6).join(' ') + (firstUserMsg.content.split(/\\s+/).length > 6 ? '…' : '')
        : 'Новый разговор';
      db.prepare('INSERT INTO sessions (id, user_id, title, mode) VALUES (?, ?, ?, ?)')
        .run(sid, auth.userId, title, skill || 'free');
    }

    // Save messages
    if (sid) {
      for (const m of messages) {
        const exists = db.prepare('SELECT id FROM messages WHERE session_id = ? AND role = ? AND content = ?')
          .get(sid, m.role, m.content);
        if (!exists) {
          db.prepare('INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, ?, ?)')
            .run(uuid(), sid, m.role, m.content);
        }
      }
      db.prepare('INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, ?, ?)')
        .run(uuid(), sid, 'assistant', assistantContent);
      db.prepare('UPDATE sessions SET updated_at = strftime(\'%s\', \'now\') WHERE id = ?').run(sid);
    }

    return NextResponse.json({
      content: assistantContent,
      sessionId: sid,
    });
  } catch (err: any) {
    console.error('Chat error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ skills: Object.entries(SKILL_PRESETS).map(([id, s]) => ({ id, name: s.name, system: s.system })) });
}
