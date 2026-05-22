import { NextRequest, NextResponse } from 'next/server';
import { createMemNote, searchMemNotes, listMemNotes } from '@/lib/mem';

// Create a note in Mem AI
export async function POST(req: NextRequest) {
  try {
    const { content, title, tags } = await req.json();
    if (!content) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 });
    }

    const result = await createMemNote({ content, title, tags });
    return NextResponse.json({ ok: true, note: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Search notes in Mem AI
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (query) {
      const results = await searchMemNotes(query);
      return NextResponse.json({ results });
    }

    const limit = parseInt(searchParams.get('limit') || '20');
    const notes = await listMemNotes(limit);
    return NextResponse.json({ notes });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
