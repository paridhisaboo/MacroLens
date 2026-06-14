import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { searchUSDA } from '@/lib/usda'
import { prisma } from '@/lib/prisma'

const schema = z.object({ q: z.string().min(2).max(100) })

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const parsed = schema.safeParse({ q: searchParams.get('q') })
  if (!parsed.success) return NextResponse.json({ error: 'Invalid query' }, { status: 400 })

  const { q } = parsed.data
  const results = await searchUSDA(q)

  // Cache in background — don't block response
  Promise.allSettled(results.map(food =>
    prisma.foodCache.upsert({
      where: { lookupKey: String(food.fdcId) },
      update: {},
      create: {
        lookupKey: String(food.fdcId),
        foodName: food.description,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        source: 'usda',
      },
    })
  ))

  return NextResponse.json({ results })
}