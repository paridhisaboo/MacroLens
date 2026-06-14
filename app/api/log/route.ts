import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const DEMO_USER_ID = 'demo-user'

const logSchema = z.object({
  foodName: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  grams: z.number().default(100),
  source: z.enum(['usda', 'barcode', 'manual']),
})

// Ensure demo user exists
async function ensureUser() {
  return prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: {
      id: DEMO_USER_ID,
      email: 'demo@macrolens.app',
    },
  })
}

export async function GET(req: NextRequest) {
  await ensureUser()
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  const start = new Date(date)
  const end = new Date(date)
  end.setDate(end.getDate() + 1)

  const logs = await prisma.foodLog.findMany({
    where: { userId: DEMO_USER_ID, loggedAt: { gte: start, lt: end } },
    orderBy: { loggedAt: 'desc' },
  })
  return NextResponse.json({ logs })
}

export async function POST(req: NextRequest) {
  await ensureUser()
  const body = await req.json()
  const parsed = logSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  const log = await prisma.foodLog.create({
    data: { ...parsed.data, userId: DEMO_USER_ID },
  })
  return NextResponse.json({ log })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await prisma.foodLog.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}