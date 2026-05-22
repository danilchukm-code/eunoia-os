const MEM_API_KEY = process.env.MEM_API_KEY;
const MEM_API_URL = process.env.MEM_API_URL || 'https://api.mem.ai';

interface MemNote {
  content: string;
  title?: string;
  tags?: string[];
}

export async function createMemNote(note: MemNote) {
  if (!MEM_API_KEY) throw new Error('MEM_API_KEY not configured');

  const response = await fetch(`${MEM_API_URL}/api/v1/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MEM_API_KEY}`,
    },
    body: JSON.stringify({
      content: note.content,
      title: note.title || 'EUNOIA Note',
      tags: note.tags || [],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Mem API error: ${response.status} - ${err}`);
  }

  return response.json();
}

export async function searchMemNotes(query: string) {
  if (!MEM_API_KEY) throw new Error('MEM_API_KEY not configured');

  const response = await fetch(`${MEM_API_URL}/api/v1/notes/search?q=${encodeURIComponent(query)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${MEM_API_KEY}`,
    },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Mem API error: ${response.status} - ${err}`);
  }

  return response.json();
}

export async function listMemNotes(limit: number = 20) {
  if (!MEM_API_KEY) throw new Error('MEM_API_KEY not configured');

  const response = await fetch(`${MEM_API_URL}/api/v1/notes?limit=${limit}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${MEM_API_KEY}`,
    },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Mem API error: ${response.status} - ${err}`);
  }

  return response.json();
}
