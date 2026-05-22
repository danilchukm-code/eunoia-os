import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getAuthUser } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const projectId = url.searchParams.get('project_id');
  const status = url.searchParams.get('status');

  let query = 'SELECT * FROM tasks WHERE user_id = ?';
  const params: any[] = [auth.userId];

  if (projectId) {
    query += ' AND project_id = ?';
    params.push(projectId);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY CASE priority WHEN \'urgent\' THEN 1 WHEN \'high\' THEN 2 WHEN \'normal\' THEN 3 ELSE 4 END, created_at DESC';

  const tasks = db.prepare(query).all(...params);
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, description, priority, projectId, sessionId, dueDate } = body;
  const id = uuid();

  db.prepare('INSERT INTO tasks (id, user_id, title, description, priority, project_id, session_id, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, auth.userId, title, description || '', priority || 'normal', projectId || null, sessionId || null, dueDate || null);

  return NextResponse.json({ id, ok: true });
}

export async function PUT(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, title, description, status, priority, projectId, dueDate } = body;

  const now = Math.floor(Date.now() / 1000);
  const completedAt = status === 'done' ? now : null;

  db.prepare('UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, project_id = ?, due_date = ?, completed_at = ?, updated_at = ? WHERE id = ? AND user_id = ?')
    .run(title, description, status, priority, projectId, dueDate, completedAt, now, id, auth.userId);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Task ID required' }, { status: 400 });

  db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(id, auth.userId);
  return NextResponse.json({ ok: true });
}
