import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { auth } from '@/lib/auth';
import { saveUserApiKey, removeUserApiKey, getApiKeyStatus } from '@/lib/ai-key';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const status = await getApiKeyStatus(session.user.id);
  return NextResponse.json(status);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { apiKey } = await req.json();
  if (typeof apiKey !== 'string' || !apiKey.startsWith('sk-ant-')) {
    return NextResponse.json({ error: 'That doesn\'t look like a valid Anthropic API key.' }, { status: 400 });
  }

  try {
    const testClient = new Anthropic({ apiKey });
    await testClient.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    });
  } catch (err) {
    return NextResponse.json({ error: 'This key was rejected by Anthropic. Double-check it and try again.' }, { status: 400 });
  }

  await saveUserApiKey(session.user.id, apiKey);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await removeUserApiKey(session.user.id);
  return NextResponse.json({ ok: true });
}