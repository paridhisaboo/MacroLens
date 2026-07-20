import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const days = Math.min(90, Math.max(1, Number(searchParams.get('days')) || 30));

  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const logs = await prisma.foodLog.findMany({
    where: { userId, loggedAt: { gte: since } },
    orderBy: { loggedAt: 'desc' },
  });

  // Group into per-day buckets (local date string, most recent first)
  const byDay = new Map<
    string,
    {
      date: string;
      totalCalories: number;
      totalProtein: number;
      totalCarbs: number;
      totalFat: number;
      logs: typeof logs;
    }
  >();

  for (const log of logs) {
    const dateKey = log.loggedAt.toISOString().split('T')[0];
    if (!byDay.has(dateKey)) {
      byDay.set(dateKey, {
        date: dateKey,
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        logs: [],
      });
    }
    const bucket = byDay.get(dateKey)!;
    bucket.totalCalories += log.calories;
    bucket.totalProtein += log.protein;
    bucket.totalCarbs += log.carbs;
    bucket.totalFat += log.fat;
    bucket.logs.push(log);
  }

  return NextResponse.json({ days: Array.from(byDay.values()) });
}