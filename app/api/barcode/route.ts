import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const barcode = searchParams.get('code')
  if (!barcode) return NextResponse.json({ error: 'Missing barcode' }, { status: 400 })

  // Check cache first
  const cached = await prisma.foodCache.findUnique({ where: { lookupKey: barcode } })
  if (cached) {
    return NextResponse.json({
      found: true,
      food: {
        fdcId: barcode,
        description: cached.foodName,
        calories: cached.calories,
        protein: cached.protein,
        carbs: cached.carbs,
        fat: cached.fat,
      }
    })
  }

  // Hit Open Food Facts
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
    { headers: { 'User-Agent': 'MacroLens/1.0' } }
  )
  const data = await res.json()

  if (data.status !== 1 || !data.product) {
    return NextResponse.json({ found: false })
  }

  const p = data.product
  const n = p.nutriments ?? {}
  const food = {
    fdcId: barcode,
    description: p.product_name || p.generic_name || 'Unknown product',
    calories: n['energy-kcal_100g'] ?? n['energy_100g'] ?? 0,
    protein: n.proteins_100g ?? 0,
    carbs: n.carbohydrates_100g ?? 0,
    fat: n.fat_100g ?? 0,
  }

  // Cache it
  await prisma.foodCache.upsert({
    where: { lookupKey: barcode },
    update: {},
    create: {
      lookupKey: barcode,
      foodName: food.description,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      source: 'barcode',
    }
  })

  return NextResponse.json({ found: true, food })
}