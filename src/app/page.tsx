'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ── Types ──────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface Session {
  id: string;
  title: string;
  mode: string;
  created_at: number;
  updated_at: number;
}

interface Skill {
  id: string;
  name: string;
  system: string;
}

// ── Helpers ────────────────────────────────────────
function escHtml(str: string) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatContent(text: string) {
  let html = escHtml(text);
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code>${code.trim()}</code></pre>`);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  return html;
}

function timeAgo(ts: number) {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return 'сейчас';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч`;
  return `${Math.floor(diff / 86400)} д`;
}

// ── Main Component ─────────────────────────────────
export default function EunoiaOS() {
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [customSystem, setCustomSystem] = useState('');
  const [showSystem, setShowSystem] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [view, setView] = useState<'chat' | 'projects' | 'tasks'>('chat');
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [taskInput, setTaskInput] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Auth check ───────────────────────────────────
  useEffect(() => {
    fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({}) }).catch(() => {});
    fetch('/api/sessions').then(r => {
      if (r.ok) {
        r.json().then(d => {
          if (d.sessions) {
            setSessions(d.sessions);
            // Check if user has skills, if not → onboarding or create defaults
            fetch('/api/skills', { credentials: 'include' }).then(sr => sr.json()).then(sd => {
              if (!sd.skills || sd.skills.length === 0) {
                // Check if onboarding was completed
                fetch('/api/onboarding', { credentials: 'include' }).then(or => or.json()).then(od => {
                  if (od.onboarding && !od.onboarding.generated_skills) {
                    // Onboarding started but not finished → redirect
                    window.location.href = '/onboarding';
                  } else if (!od.onboarding) {
                    // No onboarding at all → redirect to onboarding
                    window.location.href = '/onboarding';
                  }
                }).catch(() => {});
              }
            }).catch(() => {});
          }
        });
      }
    }).catch(() => {});
  }, []);

  const [isMobile, setIsMobile] = useState(false);

  // ── Detect mobile ──────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 700);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Load skills ──────────────────────────────────
  useEffect(() => {
    fetch('/api/chat').then(r => r.json()).then(d => {
      if (d.skills) setSkills(d.skills);
    }).catch(() => {});
  }, []);

  // ── Scroll to bottom ─────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Load session ─────────────────────────────────
  const loadSession = useCallback(async (id: string) => {
    const res = await fetch(`/api/sessions?id=${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data.messages || []);
    setCurrentSession(id);
    setSidebarOpen(false);
    setView('chat');
  }, []);

  // ── Load tasks ──────────────────────────────────
  const loadTasks = useCallback(async () => {
    const res = await fetch('/api/tasks');
    if (res.ok) {
      const data = await res.json();
      setTasks(data.tasks || []);
    }
  }, []);

  // ── New chat ─────────────────────────────────────
  const newChat = useCallback(() => {
    setCurrentSession(null);
    setMessages([]);
    setSelectedSkill('');
    setCustomSystem('');
    setSidebarOpen(false);
    setView('chat');
  }, []);

  // ── Send message ─────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: 'user' as const, content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSession,
          messages: newMessages,
          skill: selectedSkill || undefined,
          customSystem: customSystem || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessages(prev => [...prev, { role: 'assistant', content: `Ошибка: ${err.error || res.status}` }]);
        return;
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);

      if (data.sessionId && !currentSession) {
        setCurrentSession(data.sessionId);
        // Reload sessions list
        const sessRes = await fetch('/api/sessions');
        if (sessRes.ok) {
          const sessData = await sessRes.json();
          setSessions(sessData.sessions || []);
        }
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Ошибка соединения: ${err.message}` }]);
    }

    setLoading(false);
    inputRef.current?.focus();
  }, [input, loading, messages, currentSession, selectedSkill, customSystem]);

  // ── Keyboard handler ─────────────────────────────
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Auto-resize textarea ─────────────────────────
  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  // ── Skill display ────────────────────────────────
  const currentSkillName = selectedSkill
    ? skills.find(s => s.id === selectedSkill)?.name || ''
    : '';

  // ── Render ───────────────────────────────────────
  return (
    <div style={styles.root}>
      {/* Overlay */}
      {sidebarOpen && <div style={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      {/* ── SIDEBAR ─────────────────────────────── */}
      <aside style={{
        ...styles.sidebar,
        ...(isMobile ? { position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)' } : {}),
        ...(sidebarOpen && !isMobile ? styles.sidebarOpen : {})
      }}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logo}>E<span style={{ color: 'var(--gold)' }}>U</span>NOIA</div>
          <div style={styles.logoSub}>Cognitive OS</div>
        </div>

        <button style={styles.newChatBtn} onClick={newChat}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Новый разговор
        </button>

        {/* View toggle */}
        <div style={styles.viewToggle}>
          <button
            style={{ ...styles.viewBtn, ...(view === 'chat' ? styles.viewBtnActive : {}) }}
            onClick={() => { setView('chat'); setSidebarOpen(false); }}
          >
            Чат
          </button>
          <button
            style={{ ...styles.viewBtn, ...(view === 'projects' ? styles.viewBtnActive : {}) }}
            onClick={() => { setView('projects'); setSidebarOpen(false); }}
          >
            Проекты
          </button>
          <button
            style={{ ...styles.viewBtn, ...(view === 'tasks' ? styles.viewBtnActive : {}) }}
            onClick={() => { setView('tasks'); setSidebarOpen(false); loadTasks(); }}
          >
            Задачи
          </button>
        </div>

        {view === 'chat' && (
          <>
            <div style={styles.sessionsLabel}>История</div>
            <div style={styles.sessionsList}>
              {sessions.length === 0 && (
                <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--text-muted)' }}>Нет сессий</div>
              )}
              {sessions.map(s => (
                <div
                  key={s.id}
                  style={{ ...styles.sessionItem, ...(s.id === currentSession ? styles.sessionItemActive : {}) }}
                  onClick={() => loadSession(s.id)}
                >
                  <div style={{ ...styles.sessionDot, ...(s.id === currentSession ? styles.sessionDotActive : {}) }} />
                  <div style={styles.sessionTitle}>{s.title}</div>
                  <div style={styles.sessionTime}>{timeAgo(s.updated_at)}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {view === 'projects' && (
          <div style={styles.sessionsList}>
            <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
              Проекты — скоро
            </div>
          </div>
        )}

        {view === 'tasks' && (
          <div style={{ padding: '12px 0' }}>
            <div style={styles.sessionsLabel}>Активные задачи</div>
            <div style={styles.sessionsList}>
              {tasks.filter(t => t.status === 'active').length === 0 && (
                <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--text-muted)' }}>Нет активных задач</div>
              )}
              {tasks.filter(t => t.status === 'active').map(t => (
                <div key={t.id} style={styles.taskItem}>
                  <button
                    style={styles.taskCheck}
                    onClick={async () => {
                      await fetch('/api/tasks', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...t, status: 'done' })
                      });
                      loadTasks();
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={styles.taskTitle}>{t.title}</div>
                    {t.description && <div style={styles.taskDesc}>{t.description}</div>}
                  </div>
                  <span style={styles.taskPriority}>{t.priority === 'urgent' ? '🔴' : t.priority === 'high' ? '🟡' : '⚪'}</span>
                </div>
              ))}

              {tasks.filter(t => t.status === 'done').length > 0 && (
                <>
                  <div style={{ ...styles.sessionsLabel, marginTop: 16 }}>Выполнено</div>
                  {tasks.filter(t => t.status === 'done').map(t => (
                    <div key={t.id} style={{ ...styles.taskItem, opacity: 0.5 }}>
                      <span style={{ color: '#7ab87a', marginRight: 8 }}>✓</span>
                      <div style={{ flex: 1, textDecoration: 'line-through' }}>{t.title}</div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* Profile button at bottom of sidebar */}
        <div style={{ marginTop: 'auto', padding: '12px' }}>
          <button
            style={{ ...styles.newChatBtn, justifyContent: 'center' }}
            onClick={() => { setSidebarOpen(false); window.location.href = '/profile'; }}
          >
            ◎ Профиль
          </button>
        </div>
      </aside>

      {/* ── MAIN ───────────────────────────────── */}
      <main style={styles.main}>
        {/* Header */}
        <header style={styles.header}>
          <button style={{ ...styles.menuToggle, ...(isMobile ? { display: 'flex' } : {}) }} onClick={() => setSidebarOpen(!sidebarOpen)}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <span style={styles.headerTitle}>
            {currentSession
              ? sessions.find(s => s.id === currentSession)?.title || 'Разговор'
              : selectedSkill
                ? `✦ ${currentSkillName}`
                : 'Новый разговор'}
          </span>
          <div style={{ flex: 1 }} />
          {selectedSkill && (
            <span style={styles.skillBadge}>{currentSkillName}</span>
          )}
        </header>

        {/* Messages */}
        <div style={styles.messages}>
          <div style={styles.messagesInner}>
            {messages.length === 0 && (
              <div style={styles.emptyState}>
                <div style={styles.emptyGlyph}>ε</div>
                <div style={styles.emptyTitle}>EUNOIA OS</div>
                <div style={styles.emptySub}>
                  Твоя когнитивная операционная система.<br/>
                  Выбери режим — и начни думать.
                </div>

                {/* Skill selector */}
                <div style={styles.skillGrid}>
                  {skills.map(skill => (
                    <button
                      key={skill.id}
                      style={styles.skillCard}
                      onClick={() => { setSelectedSkill(skill.id); setShowSystem(true); setCustomSystem(skill.system); }}
                    >
                      <div style={styles.skillCardName}>{skill.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ ...styles.message, ...(m.role === 'user' ? styles.messageUser : {}) }}>
                <div style={{ ...styles.avatar, ...(m.role === 'user' ? styles.avatarUser : {}) }}>
                  {m.role === 'user' ? 'M' : 'ε'}
                </div>
                <div
                  style={{ ...styles.bubble, ...(m.role === 'user' ? styles.bubbleUser : {}) }}
                  dangerouslySetInnerHTML={{ __html: formatContent(m.content) }}
                />
              </div>
            ))}

            {loading && (
              <div style={styles.message}>
                <div style={styles.avatar}>ε</div>
                <div style={styles.bubble}>
                  <div style={styles.thinking}>
                    <div style={styles.thinkingDot} />
                    <div style={{ ...styles.thinkingDot, animationDelay: '0.2s' }} />
                    <div style={{ ...styles.thinkingDot, animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div style={styles.inputArea}>
          {/* Skill selector when in chat */}
          {messages.length > 0 && (
            <div style={styles.skillBar}>
              {skills.map(skill => (
                <button
                  key={skill.id}
                  style={{ ...styles.skillChip, ...(selectedSkill === skill.id ? styles.skillChipActive : {}) }}
                  onClick={() => { setSelectedSkill(skill.id); setCustomSystem(skill.system); }}
                >
                  {skill.name}
                </button>
              ))}
            </div>
          )}

          {/* System prompt toggle */}
          <div style={styles.systemToggle}>
            <button
              style={{ ...styles.systemBtn, ...(showSystem ? styles.systemBtnActive : {}) }}
              onClick={() => setShowSystem(!showSystem)}
            >
              ◎ Контекст
            </button>
          </div>

          {showSystem && (
            <div style={styles.systemPromptArea}>
              <div style={styles.systemPromptLabel}>Системный контекст</div>
              <textarea
                style={styles.systemPromptInput}
                placeholder="Контекст для AI..."
                value={customSystem}
                onChange={e => setCustomSystem(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <div style={styles.inputWrap}>
            <textarea
              ref={inputRef}
              style={styles.chatInput}
              placeholder="Что у тебя на уме..."
              value={input}
              onChange={e => { setInput(e.target.value); autoResize(e.target as HTMLTextAreaElement); }}
              onKeyDown={handleKey}
              rows={1}
            />
            <button
              style={{ ...styles.sendBtn, ...(loading || !input.trim() ? styles.sendBtnDisabled : {}) }}
              onClick={sendMessage}
              disabled={loading || !input.trim()}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8h12M8 2l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div style={styles.inputHint}>Enter — отправить · Shift+Enter — перенос</div>
        </div>
      </main>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  root: {
    fontFamily: "'DM Sans', sans-serif",
    background: '#1a1714',
    color: '#e8e2d8',
    height: '100dvh',
    display: 'flex',
    overflow: 'hidden',
    fontWeight: 300,
  },
  overlay: {
    display: 'none',
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 99,
  },
  // Sidebar
  sidebar: {
    width: 260,
    background: '#201e1a',
    borderRight: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    transition: 'transform 0.3s ease',
    zIndex: 100,
  },
  sidebarOpen: {},
  sidebarHeader: {
    padding: '20px 18px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  logo: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 22,
    fontWeight: 300,
    letterSpacing: '0.18em',
    color: '#e8e2d8',
    textTransform: 'uppercase',
  },
  logoSub: {
    fontSize: 10,
    letterSpacing: '0.22em',
    color: '#6a6460',
    textTransform: 'uppercase',
    marginTop: 3,
  },
  newChatBtn: {
    margin: '14px 12px 12px',
    padding: '9px 14px',
    background: 'rgba(196,169,106,0.15)',
    border: '1px solid rgba(196,169,106,0.25)',
    borderRadius: 8,
    color: '#c4a96a',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    fontWeight: 400,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: 'calc(100% - 24px)',
  },
  viewToggle: {
    display: 'flex',
    margin: '0 12px 8px',
    gap: 4,
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    padding: 3,
  },
  viewBtn: {
    flex: 1,
    padding: '6px 10px',
    background: 'none',
    border: 'none',
    borderRadius: 6,
    color: '#6a6460',
    fontSize: 11,
    fontWeight: 400,
    letterSpacing: '0.06em',
    cursor: 'pointer',
    textTransform: 'uppercase',
  },
  viewBtnActive: {
    background: 'rgba(196,169,106,0.15)',
    color: '#c4a96a',
  },
  sessionsLabel: {
    padding: '10px 18px 6px',
    fontSize: 10,
    letterSpacing: '0.16em',
    color: '#6a6460',
    textTransform: 'uppercase',
  },
  sessionsList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 8px 12px',
  },
  sessionItem: {
    padding: '9px 12px',
    borderRadius: 7,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },
  sessionItemActive: {
    background: 'rgba(196,169,106,0.15)',
  },
  sessionDot: {
    width: 5, height: 5,
    borderRadius: '50%',
    background: '#6a6460',
    flexShrink: 0,
  },
  sessionDotActive: {
    background: '#c4a96a',
  },
  sessionTitle: {
    fontSize: 13,
    color: '#a09890',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
  },
  sessionTime: {
    fontSize: 10,
    color: '#6a6460',
    flexShrink: 0,
  },
  // Main
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  },
  header: {
    height: 56,
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    gap: 14,
    flexShrink: 0,
  },
  menuToggle: {
    display: 'none',
    background: 'none', border: 'none',
    color: '#a09890', cursor: 'pointer',
    padding: 4,
  },
  headerTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 16,
    fontWeight: 300,
    letterSpacing: '0.12em',
    color: '#a09890',
    fontStyle: 'italic',
  },
  skillBadge: {
    fontSize: 11,
    color: '#c4a96a',
    padding: '3px 9px',
    background: 'rgba(196,169,106,0.1)',
    border: '1px solid rgba(196,169,106,0.2)',
    borderRadius: 20,
    letterSpacing: '0.04em',
  },
  // Messages
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '28px 0',
  },
  messagesInner: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  // Empty state
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    textAlign: 'center',
    padding: '40px 24px',
  },
  emptyGlyph: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 64,
    fontWeight: 300,
    color: '#c4a96a',
    opacity: 0.3,
    lineHeight: 1,
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 26,
    fontWeight: 300,
    color: '#e8e2d8',
    letterSpacing: '0.06em',
    marginBottom: 10,
  },
  emptySub: {
    fontSize: 13,
    color: '#6a6460',
    lineHeight: 1.7,
    marginBottom: 28,
  },
  skillGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    maxWidth: 500,
  },
  skillCard: {
    padding: '10px 16px',
    background: 'rgba(255,255,255,0.045)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    fontSize: 12,
    color: '#a09890',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
  // Messages
  message: {
    display: 'flex',
    gap: 12,
  },
  messageUser: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 30, height: 30,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 500,
    letterSpacing: '0.05em',
    marginTop: 2,
    background: 'rgba(196,169,106,0.15)',
    border: '1px solid rgba(196,169,106,0.2)',
    color: '#c4a96a',
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 14,
  },
  avatarUser: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#a09890',
    fontSize: 10,
  },
  bubble: {
    maxWidth: '76%',
    padding: '13px 16px',
    borderRadius: '4px 12px 12px 12px',
    lineHeight: 1.7,
    fontSize: 14,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#e8e2d8',
  },
  bubbleUser: {
    background: 'rgba(196,169,106,0.1)',
    border: '1px solid rgba(196,169,106,0.15)',
    borderRadius: '12px 4px 12px 12px',
  },
  // Thinking
  thinking: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 0',
  },
  thinkingDot: {
    width: 5, height: 5,
    borderRadius: '50%',
    background: '#c4a96a',
    opacity: 0.4,
  },
  // Input
  inputArea: {
    padding: '16px 24px 20px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  skillBar: {
    maxWidth: 720,
    margin: '0 auto 8px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillChip: {
    padding: '4px 10px',
    background: 'none',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    color: '#6a6460',
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '0.04em',
  },
  skillChipActive: {
    color: '#c4a96a',
    borderColor: 'rgba(196,169,106,0.3)',
    background: 'rgba(196,169,106,0.08)',
  },
  systemToggle: {
    maxWidth: 720,
    margin: '0 auto 8px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  systemBtn: {
    background: 'none',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6,
    color: '#6a6460',
    fontSize: 11,
    padding: '4px 10px',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '0.06em',
    display: 'flex', alignItems: 'center', gap: 5,
  },
  systemBtnActive: {
    color: '#c4a96a',
    borderColor: 'rgba(196,169,106,0.3)',
    background: 'rgba(196,169,106,0.08)',
  },
  systemPromptArea: {
    maxWidth: 720,
    margin: '0 auto 10px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(196,169,106,0.2)',
    borderRadius: 10,
    padding: '10px 14px',
  },
  systemPromptLabel: {
    fontSize: 10,
    letterSpacing: '0.14em',
    color: '#c4a96a',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  systemPromptInput: {
    width: '100%',
    background: 'none',
    border: 'none',
    outline: 'none',
    color: '#a09890',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: 300,
    lineHeight: 1.6,
    resize: 'none',
    minHeight: 56,
  },
  inputWrap: {
    maxWidth: 720,
    margin: '0 auto',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'flex-end',
    gap: 10,
    padding: '10px 12px 10px 16px',
  },
  chatInput: {
    flex: 1,
    background: 'none',
    border: 'none',
    outline: 'none',
    color: '#e8e2d8',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    fontWeight: 300,
    lineHeight: 1.6,
    resize: 'none',
    maxHeight: 160,
    minHeight: 22,
  },
  sendBtn: {
    width: 34, height: 34,
    borderRadius: 8,
    background: 'rgba(196,169,106,0.15)',
    border: '1px solid rgba(196,169,106,0.3)',
    color: '#c4a96a',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnDisabled: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },
  taskItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    borderRadius: 7,
    marginBottom: 2,
  },
  taskCheck: {
    width: 18, height: 18,
    borderRadius: 4,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'none',
    cursor: 'pointer',
    flexShrink: 0,
  },
  taskTitle: {
    fontSize: 13,
    color: '#e8e2d8',
  },
  taskDesc: {
    fontSize: 11,
    color: '#6a6460',
    marginTop: 2,
  },
  taskPriority: {
    fontSize: 12,
    flexShrink: 0,
  },
  inputHint: {
    maxWidth: 720,
    margin: '6px auto 0',
    fontSize: 11,
    color: '#6a6460',
    textAlign: 'center',
    letterSpacing: '0.03em',
  },
};
