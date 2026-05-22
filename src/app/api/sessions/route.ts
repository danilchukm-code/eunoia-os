import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const sessionId = url.searchParams.get('id');

  if (sessionId) {
    const session = db.prepare('SELECT * FROM sessions WHERE id = ? AND user_id = ?').get(sessionId, auth.userId);
    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const messages = db.prepare('SELECT role, content, created_at FROM messages WHERE session_id = ? ORDER BY created_at').all(sessionId);
    return NextResponse.json({ session, messages });
  }

  const sessions = db.prepare('SELECT id, title, mode, created_at, updated_at FROM sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50').all(auth.userId);
  return NextResponse.json({ sessions });
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const sessionId = url.searchParams.get('id');
  if (!sessionId) return NextResponse.json({ error: 'Session ID required' }, { status: 400 });

  db.prepare('DELETE FROM messages WHERE session_id = ?').run(sessionId);
  db.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?').run(sessionId, auth.userId);
  return NextResponse.json({ ok: true });
}