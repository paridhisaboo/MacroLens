export interface USDAFood {
  fdcId: number
  description: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

function getNutrient(nutrients: any[], id: number): number {
  return nutrients.find((n: any) => n.nutrientId === id)?.value ?? 0
}

export async function searchUSDA(query: string): Promise<USDAFood[]> {
  const res = await fetch(
    `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=50&dataType=Foundation,SR%20Legacy,Branded&api_key=${process.env.USDA_API_KEY}`
  )
  if (!res.ok) throw new Error('USDA API error')
  const data = await res.json()

  const seen = new Set<string>()
  const results: USDAFood[] = []

  for (const food of data.foods ?? []) {
    const calories = getNutrient(food.foodNutrients, 1008)
    if (calories === 0) continue // skip zero-calorie noise

    // Deduplicate by normalized name
    const key = food.description.toLowerCase().trim()
    if (seen.has(key)) continue
    seen.add(key)

    results.push({
      fdcId: food.fdcId,
      description: food.description,
      calories,
      protein: getNutrient(food.foodNutrients, 1003),
      carbs: getNutrient(food.foodNutrients, 1005),
      fat: getNutrient(food.foodNutrients, 1004),
    })

    if (results.length >= 15) break
  }

  return results
}