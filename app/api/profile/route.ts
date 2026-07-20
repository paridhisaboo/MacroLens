import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

const profileSchema = z.object({
  heightCm: z.number().positive().nullable().optional(),
  weightKg: z.number().positive().nullable().optional(),
  dailyCalories: z.number().int().positive().optional(),
  dailyProtein: z.number().positive().optional(),
  dailyCarbs: z.number().positive().optional(),
  dailyFat: z.number().positive().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      heightCm: true,
      weightKg: true,
      dailyCalories: true,
      dailyProtein: true,
      dailyCarbs: true,
      dailyFat: true,
    },
  });

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: parsed.data,
    select: {
      heightCm: true,
      weightKg: true,
      dailyCalories: true,
      dailyProtein: true,
      dailyCarbs: true,
      dailyFat: true,
    },
  });

  return NextResponse.json(updated);
}