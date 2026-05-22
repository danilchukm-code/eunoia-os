import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getAuthUser } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projects = db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC').all(auth.userId);
  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, description, type, content, sessionIds } = body;
  const id = uuid();
  db.prepare('INSERT INTO projects (id, user_id, title, description, type, content, session_ids) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, auth.userId, title, description || '', type || 'essay', content || '', JSON.stringify(sessionIds || []));
  return NextResponse.json({ id, ok: true });
}

export async function PUT(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, title, description, type, content, status, sessionIds } = body;
  const now = Math.floor(Date.now() / 1000);
  db.prepare('UPDATE projects SET title = ?, description = ?, type = ?, content = ?, status = ?, session_ids = ?, updated_at = ? WHERE id = ? AND user_id = ?')
    .run(title, description, type, content, status, JSON.stringify(sessionIds || []), now, id, auth.userId);
  return NextResponse.json({ ok: true });
}
