import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';

// Get current user
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('eunoia_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(payload.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Update profile
export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get('eunoia_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, oldPassword, newPassword } = await req.json();

    // If changing password, verify old one
    if (newPassword) {
      if (!oldPassword) {
        return NextResponse.json({ error: 'Укажите старый пароль' }, { status: 400 });
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'Пароль должен быть не менее 6 символов' }, { status: 400 });
      }
      const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(payload.userId) as { password_hash: string };
      const valid = await bcrypt.compare(oldPassword, user.password_hash);
      if (!valid) {
        return NextResponse.json({ error: 'Неверный старый пароль' }, { status: 400 });
      }
      const newHash = await bcrypt.hash(newPassword, 12);
      db.prepare('UPDATE users SET password_hash = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?')
        .run(newHash, payload.userId);
    }

    // Update name
    if (name) {
      db.prepare('UPDATE users SET name = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?')
        .run(name, payload.userId);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
