import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { createToken } from '@/lib/auth';
import db, { ensureDefaultSkills } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const id = uuid();
    const password_hash = await bcrypt.hash(password, 12);
    db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)')
      .run(id, email, password_hash, name || 'User');

    ensureDefaultSkills(id);

    const token = await createToken(id);
    const res = NextResponse.json({ ok: true, user: { id, email, name: name || 'User' } });
    res.cookies.set('eunoia_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
