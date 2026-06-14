import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const fdcId = searchParams.get('fdcId')
  if (!fdcId) return NextResponse.json({ error: 'Missing fdcId' }, { status: 400 })

  const res = await fetch(
    `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${process.env.USDA_API_KEY}`
  )
  if (!res.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const data = await res.json()

  const get = (name: string) => {
    const n = data.foodNutrients?.find((x: any) =>
      x.nutrient?.name?.toLowerCase().includes(name.toLowerCase())
    )
    return n ? Math.round((n.amount ?? 0) * 10) / 10 : null
  }

  return NextResponse.json({
    fdcId,
    description: data.description,
    category: data.foodCategory?.description ?? data.brandOwner ?? null,
    nutrients: {
      calories: get('energy'),
      protein: get('protein'),
      carbs: get('carbohydrate'),
      fat: get('total lipid'),
      fiber: get('fiber'),
      sugar: get('sugars'),
      sodium: get('sodium'),
      calcium: get('calcium'),
      iron: get('iron'),
      vitaminC: get('vitamin c'),
      saturatedFat: get('saturated'),
      cholesterol: get('cholesterol'),
    }
  })
}