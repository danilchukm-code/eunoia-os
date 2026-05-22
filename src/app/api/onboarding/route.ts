import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import db, { saveOnboarding, getOnboarding } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('eunoia_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { occupation, goal, communication_style } = await req.json();
    if (!occupation || !goal || !communication_style) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    }

    saveOnboarding(payload.userId, { occupation, goal, communication_style });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('eunoia_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const onboarding = getOnboarding(payload.userId);
    return NextResponse.json({ onboarding: onboarding || null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
