import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'eunoia.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT DEFAULT 'User',
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT DEFAULT 'Новый разговор',
    mode TEXT DEFAULT 'free',
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'essay',
    status TEXT DEFAULT 'draft',
    content TEXT,
    session_ids TEXT DEFAULT '[]',
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    system_prompt TEXT,
    icon TEXT DEFAULT '✦',
    is_default INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );


  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'done', 'archived')),
    priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
    project_id TEXT,
    session_id TEXT,
    due_date INTEGER,
    completed_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
  CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);

  CREATE TABLE IF NOT EXISTS user_onboarding (
    user_id TEXT PRIMARY KEY,
    occupation TEXT,
    goal TEXT,
    communication_style TEXT,
    generated_skills INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Insert default skills for new users
const defaultSkills = [
  {
    id: 'essay',
    name: 'Эссе',
    description: 'Помогает написать эссе для EUNOIA Review. Находит угол, структурирует мысль, доводит до готового текста.',
    system_prompt: 'Ты — философский редактор EUNOIA Review. Помогаешь писать эссе в стиле люксового минимализма: интеллектуально, точно, с воздухом. Не упрощаешь — усиливаешь. Знаешь контекст СП→СС, философию EUNOIA. Без воды, без клише.',
    icon: '✍️',
  },
  {
    id: 'untangle',
    name: 'Распутать мысль',
    description: 'Когда мысль крутится и не складывается. Помогает найти ядро и формулировать.',
    system_prompt: 'Ты — философский ассистент. Пользователь приходит с запутанной мыслью. Не давай готовых ответов. Задавай точные вопросы, находи корень, помогай сформулировать то, что она на самом деле хочет сказать. Коротко. Глубоко.',
    icon: '🧶',
  },
  {
    id: 'pattern',
    name: 'Найти паттерн',
    description: 'Анализирует то, что ты сказала, и находит скрытые паттерны, связи, повторения.',
    system_prompt: 'Ты — аналитик паттернов. Пользователь даёт поток мыслей, заметок, разговоров. Твоя задача — найти скрытые паттерны, повторяющиеся темы, неочевидные связи. Не резюмируй — синтезируй. Покажи то, что она сама не видит.',
    icon: '🔮',
  },
  {
    id: 'clarify',
    name: 'Сформулировать идею',
    description: 'Берёт размытую идею и делает её чёткой, точной, сильной.',
    system_prompt: 'Ты — точности слов. Пользователь даёт размытую идею. Ты задаёшь один точный вопрос, потом формулируешь её ясно и сильно. Убираешь лишнее. Оставляешь суть. Каждое слово должно работать.',
    icon: '💎',
  },
  {
    id: 'priorities',
    name: 'Приоритеты EUNOIA',
    description: 'Помогает определить, что сейчас самое важное в проекте EUNOIA и почему.',
    system_prompt: 'Ты — стратег EUNOIA. Знаешь философию проект: СП→СС, три столпа, три слоя бизнеса. Помогаешь определить приоритеты на основе стратегии, не на основе срочности. Учитываешь, что пользователь работает из потока, не из дедлайна.',
    icon: '🎯',
  },
  {
    id: 'book',
    name: 'Книга',
    description: 'Режим написания книги EUNOIA. Знает контекст: Гепард, Среда, манифест.',
    system_prompt: 'Ты — соавтор книг EUNOIA. Знаешь контекст проекта: Гепард, СРЕДА, философия СП→СС, белые вороны, архитектура свободы. Помогаешь писать в потоке, сохраняя стиль EUNOIA: интеллектуально, точно, с воздухом. Люксовый минимализм. Без блогерского тона.',
    icon: '📖',
  },
];

export function ensureDefaultSkills(userId: string) {
  const existing = db.prepare('SELECT COUNT(*) as count FROM skills WHERE user_id = ?').get(userId) as { count: number };
  if (existing.count === 0) {
    const insert = db.prepare('INSERT INTO skills (id, user_id, name, description, system_prompt, icon, is_default) VALUES (?, ?, ?, ?, ?, ?, 1)');
    for (const skill of defaultSkills) {
      insert.run(`${userId}_${skill.id}`, userId, skill.name, skill.description, skill.system_prompt, skill.icon);
    }
  }
}

// Onboarding functions
export function saveOnboarding(userId: string, data: { occupation: string; goal: string; communication_style: string }) {
  db.prepare('INSERT OR REPLACE INTO user_onboarding (user_id, occupation, goal, communication_style) VALUES (?, ?, ?, ?)')
    .run(userId, data.occupation, data.goal, data.communication_style);
}

export function getOnboarding(userId: string) {
  return db.prepare('SELECT * FROM user_onboarding WHERE user_id = ?').get(userId) as {
    user_id: string; occupation: string; goal: string; communication_style: string; generated_skills: number;
  } | undefined;
}

export function markSkillsGenerated(userId: string) {
  db.prepare('UPDATE user_onboarding SET generated_skills = 1 WHERE user_id = ?').run(userId);
}

export function saveSkill(userId: string, skill: { id: string; name: string; description: string; system_prompt: string; icon: string }) {
  db.prepare('INSERT OR REPLACE INTO skills (id, user_id, name, description, system_prompt, icon, is_default) VALUES (?, ?, ?, ?, ?, ?, 0)')
    .run(`${userId}_${skill.id}`, userId, skill.name, skill.description, skill.system_prompt, skill.icon);
}

export default db;
