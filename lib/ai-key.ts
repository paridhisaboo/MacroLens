import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/crypto';

export class TrialExhaustedError extends Error {
  constructor() {
    super('Trial exhausted: add your own Anthropic API key to keep using AI features.');
    this.name = 'TrialExhaustedError';
  }
}

export interface ResolvedKey {
  apiKey: string;
  usingOwnKey: boolean;
  trialRemaining: number | null;
}

export async function resolveApiKey(userId: string): Promise<ResolvedKey> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { anthropicApiKeyEncrypted: true, aiTrialUsesRemaining: true },
  });

  if (!user) throw new Error('User not found');

  if (user.anthropicApiKeyEncrypted) {
    const apiKey = await decrypt(user.anthropicApiKeyEncrypted);
    return { apiKey, usingOwnKey: true, trialRemaining: null };
  }

  if (user.aiTrialUsesRemaining <= 0) {
    throw new TrialExhaustedError();
  }

  const updated = await prisma.user.updateMany({
    where: { id: userId, aiTrialUsesRemaining: { gt: 0 } },
    data: { aiTrialUsesRemaining: { decrement: 1 } },
  });

  if (updated.count === 0) {
    throw new TrialExhaustedError();
  }

  const appKey = process.env.ANTHROPIC_API_KEY;
  if (!appKey) throw new Error('ANTHROPIC_API_KEY is not configured on the server');

  const fresh = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiTrialUsesRemaining: true },
  });

  return { apiKey: appKey, usingOwnKey: false, trialRemaining: fresh?.aiTrialUsesRemaining ?? 0 };
}

export async function saveUserApiKey(userId: string, apiKey: string): Promise<void> {
  const encrypted = await encrypt(apiKey);
  await prisma.user.update({
    where: { id: userId },
    data: { anthropicApiKeyEncrypted: encrypted },
  });
}

export async function removeUserApiKey(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { anthropicApiKeyEncrypted: null },
  });
}

export async function getApiKeyStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { anthropicApiKeyEncrypted: true, aiTrialUsesRemaining: true },
  });
  return {
    hasOwnKey: !!user?.anthropicApiKeyEncrypted,
    trialRemaining: user?.aiTrialUsesRemaining ?? 0,
  };
}