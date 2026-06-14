'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AISuggestions from '@/components/AISuggestions'

interface Food {
  fdcId: string | number
  description: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface FoodDetail {
  description: string
  category: string | null
  nutrients: {
    calories: number | null
    protein: number | null
    carbs: number | null
    fat: number | null
    fiber: number | null
    sugar: number | null
    sodium: number | null
    calcium: number | null
    iron: number | null
    vitaminC: number | null
    saturatedFat: number | null
    cholesterol: number | null
  }
}

interface LogEntry {
  id: string
  foodName: string
  calories: number
  protein: number
  carbs: number
  fat: number
  grams: number
  source: string
  loggedAt: string
}

function MacroRing({ value, max, color, label, unit = 'g' }: {
  value: number; max: number; color: string; label: string; unit?: string
}) {
  const pct = Math.min(value / max, 1)
  const r = 28
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct)
  const over = value > max
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" className="-rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#f1f0ef" strokeWidth="5" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={over ? '#f87171' : color}
          strokeWidth="5" strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="text-center -mt-1" style={{ marginTop: '-52px', position: 'relative', zIndex: 1, height: '72px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-sm font-mono font-semibold text-stone-800">{Math.round(value)}</div>
        <div className="text-xs text-stone-400">{unit}</div>
      </div>
      <div className="text-xs text-stone-500 uppercase tracking-widest font-mono">{label}</div>
    </div>
  )
}

function NutrientRow({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  if (value === null || value === 0) return null
  return (
    <div className="flex justify-between items-center py-2 border-b border-stone-50">
      <span className="text-sm text-stone-600">{label}</span>
      <span className="text-sm font-mono text-stone-800">{value}{unit}</span>
    </div>
  )
}

function FoodModal({ food, onClose, onAdd }: {
  food: Food; onClose: () => void; onAdd: (f: Food, g: number) => void
}) {
  const [grams, setGrams] = useState(100)
  const [showDetail, setShowDetail] = useState(false)
  const scale = grams / 100

  const { data: detail, isFetching: loadingDetail } = useQuery<FoodDetail>({
    queryKey: ['detail', food.fdcId],
    queryFn: async () => {
      const r = await fetch(`/api/food-detail?fdcId=${food.fdcId}`)
      return r.json()
    },
    enabled: showDetail,
  })

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="p-6 space-y-5">
          <div>
            <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-1">Add to log</p>
            <h2 className="font-semibold text-stone-900 leading-snug">{food.description}</h2>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Cal', value: Math.round(food.calories * scale), unit: 'kcal' },
              { label: 'Prot', value: Math.round(food.protein * scale), unit: 'g' },
              { label: 'Carbs', value: Math.round(food.carbs * scale), unit: 'g' },
              { label: 'Fat', value: Math.round(food.fat * scale), unit: 'g' },
            ].map(m => (
              <div key={m.label} className="bg-stone-50 rounded-xl p-3 text-center">
                <div className="text-lg font-mono font-medium text-stone-900">{m.value}</div>
                <div className="text-xs text-stone-400 mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-mono text-stone-500 uppercase tracking-widest">Serving size</label>
            <div className="flex items-center gap-3">
              <input type="range" min={10} max={500} step={5} value={grams}
                onChange={e => setGrams(+e.target.value)}
                className="flex-1 accent-stone-800" />
              <div className="flex items-center gap-1 bg-stone-100 rounded-lg px-3 py-1.5">
                <input type="number" value={grams} onChange={e => setGrams(+e.target.value)}
                  className="w-12 bg-transparent font-mono text-sm text-center outline-none" />
                <span className="text-xs text-stone-400">g</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowDetail(!showDetail)}
            className="w-full py-2 rounded-xl border border-stone-200 text-sm text-stone-600 hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
          >
            {loadingDetail ? (
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
                Loading details…
              </span>
            ) : showDetail ? '▲ Hide full nutrition' : '▼ Full nutrition info'}
          </button>
          {showDetail && detail && (
            <div className="bg-stone-50 rounded-xl p-4 space-y-1">
              {detail.category && (
                <p className="text-xs text-stone-400 mb-3 font-mono">{detail.category}</p>
              )}
              <NutrientRow label="Fiber" value={detail.nutrients.fiber ? Math.round(detail.nutrients.fiber * scale * 10) / 10 : null} unit="g" />
              <NutrientRow label="Sugar" value={detail.nutrients.sugar ? Math.round(detail.nutrients.sugar * scale * 10) / 10 : null} unit="g" />
              <NutrientRow label="Saturated fat" value={detail.nutrients.saturatedFat ? Math.round(detail.nutrients.saturatedFat * scale * 10) / 10 : null} unit="g" />
              <NutrientRow label="Cholesterol" value={detail.nutrients.cholesterol ? Math.round(detail.nutrients.cholesterol * scale) : null} unit="mg" />
              <NutrientRow label="Sodium" value={detail.nutrients.sodium ? Math.round(detail.nutrients.sodium * scale) : null} unit="mg" />
              <NutrientRow label="Calcium" value={detail.nutrients.calcium ? Math.round(detail.nutrients.calcium * scale) : null} unit="mg" />
              <NutrientRow label="Iron" value={detail.nutrients.iron ? Math.round(detail.nutrients.iron * scale * 10) / 10 : null} unit="mg" />
              <NutrientRow label="Vitamin C" value={detail.nutrients.vitaminC ? Math.round(detail.nutrients.vitaminC * scale * 10) / 10 : null} unit="mg" />
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-600 hover:bg-stone-50 transition-colors">
              Cancel
            </button>
            <button onClick={() => { onAdd(food, grams); onClose() }}
              className="flex-1 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-700 transition-colors">
              Add to log
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function BarcodeScanner({ onResult, onClose }: {
  onResult: (food: Food) => void; onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error' | 'found'>('starting')
  const [errorMsg, setErrorMsg] = useState('')
  const streamRef = useRef<MediaStream | null>(null)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  useEffect(() => {
    let reader: any = null
    async function start() {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/library')
        reader = new BrowserMultiFormatReader()
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setStatus('scanning')
        reader.decodeFromVideoElement(videoRef.current, async (result: any, err: any) => {
          if (result) {
            setStatus('found')
            reader?.reset()
            stopCamera()
            const code = result.getText()
            const res = await fetch(`/api/barcode?code=${code}`)
            const data = await res.json()
            if (data.found) {
              onResult(data.food)
            } else {
              setStatus('error')
              setErrorMsg(`Barcode ${code} not found in database`)
            }
          }
        })
      } catch (e: any) {
        setStatus('error')
        setErrorMsg(e.message ?? 'Camera access denied')
      }
    }
    start()
    return () => { reader?.reset(); stopCamera() }
  }, [onResult, stopCamera])

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      <div className="flex items-center justify-between p-4">
        <p className="text-white font-medium">Scan barcode</p>
        <button onClick={() => { stopCamera(); onClose() }}
          className="text-white/70 hover:text-white text-2xl leading-none">×</button>
      </div>
      <div className="flex-1 relative flex items-center justify-center">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-40 border-2 border-white/60 rounded-xl relative">
            <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
            <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
            <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
            <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />
          </div>
        </div>
        {status === 'starting' && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm">Starting camera…</p>
            </div>
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6">
            <div className="text-center">
              <p className="text-red-400 text-sm mb-4">{errorMsg}</p>
              <button onClick={() => { stopCamera(); onClose() }}
                className="px-4 py-2 bg-white text-black rounded-xl text-sm">Close</button>
            </div>
          </div>
        )}
        {status === 'found' && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="text-4xl mb-2">✓</div>
              <p className="text-sm">Barcode found!</p>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 text-center">
        <p className="text-white/50 text-xs">Point camera at a barcode</p>
      </div>
    </div>
  )
}

export default function Home() {
  const [query, setQuery] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [date] = useState(new Date().toISOString().split('T')[0])
  const qc = useQueryClient()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQ(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const { data: searchData, isFetching } = useQuery({
    queryKey: ['search', debouncedQ],
    queryFn: async () => {
      if (debouncedQ.length < 2) return { results: [] }
      const r = await fetch(`/api/search?q=${encodeURIComponent(debouncedQ)}`)
      return r.json()
    },
    enabled: debouncedQ.length >= 2,
  })

  const { data: logData } = useQuery({
    queryKey: ['log', date],
    queryFn: async () => {
      const r = await fetch(`/api/log?date=${date}`)
      return r.json()
    },
  })

  const addMutation = useMutation({
    mutationFn: async ({ food, grams }: { food: Food; grams: number }) => {
      const scale = grams / 100
      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          foodName: food.description,
          calories: food.calories * scale,
          protein: food.protein * scale,
          carbs: food.carbs * scale,
          fat: food.fat * scale,
          grams,
          source: 'usda',
        }),
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['log', date] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/log?id=${id}`, { method: 'DELETE' })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['log', date] }),
  })

  const logs: LogEntry[] = logData?.logs ?? []
  const totals = logs.reduce((acc, l) => ({
    calories: acc.calories + l.calories,
    protein: acc.protein + l.protein,
    carbs: acc.carbs + l.carbs,
    fat: acc.fat + l.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  const targets = { calories: 2000, protein: 150, carbs: 250, fat: 65 }
  const results: Food[] = searchData?.results ?? []

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-stone-900 tracking-tight">MacroLens</h1>
            <p className="text-xs text-stone-400 font-mono">{date}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAI(true)}
              className="flex items-center gap-2 bg-teal-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-teal-500 transition-colors"
            >
              Ask AI
            </button>
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-2 bg-stone-900 text-white text-sm px-4 py-2 rounded-xl hover:bg-stone-700 transition-colors"
            >
              <span>⬛</span> Scan
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
          <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-5">Today's macros</p>
          <div className="flex justify-around">
            <MacroRing value={totals.calories} max={targets.calories} color="#fbbf24" label="Cal" unit="kcal" />
            <MacroRing value={totals.protein} max={targets.protein} color="#60a5fa" label="Prot" />
            <MacroRing value={totals.carbs} max={targets.carbs} color="#34d399" label="Carbs" />
            <MacroRing value={totals.fat} max={targets.fat} color="#f87171" label="Fat" />
          </div>
          <div className="mt-4 pt-4 border-t border-stone-50 flex justify-center">
            <div className="text-center">
              <span className="text-3xl font-mono font-semibold text-stone-900">{Math.round(totals.calories)}</span>
              <span className="text-sm text-stone-400 ml-2">/ {targets.calories} kcal</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search foods… (e.g. chicken breast, oats)"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all placeholder:text-stone-300 shadow-sm"
            />
            {isFetching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
              </div>
            )}
          </div>
          {results.length > 0 && query.length >= 2 && (
            <div className="bg-white border border-stone-100 rounded-2xl shadow-sm overflow-hidden">
              {results.map((food, i) => (
                <button key={food.fdcId} onClick={() => setSelectedFood(food)}
                  className={`w-full text-left px-4 py-3.5 hover:bg-stone-50 transition-colors flex items-center justify-between gap-3 ${i > 0 ? 'border-t border-stone-50' : ''}`}>
                  <span className="text-sm text-stone-800 font-medium leading-snug line-clamp-2">{food.description}</span>
                  <div className="flex gap-2 shrink-0">
                    <span className="text-xs font-mono text-stone-500 bg-stone-100 rounded-md px-2 py-0.5">{Math.round(food.calories)} cal</span>
                    <span className="text-xs font-mono text-blue-500 bg-blue-50 rounded-md px-2 py-0.5">{Math.round(food.protein)}p</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-mono text-stone-400 uppercase tracking-widest px-1">Food log</p>
          {logs.length === 0 ? (
            <div className="bg-white border border-stone-100 rounded-2xl p-8 text-center">
              <p className="text-stone-300 text-sm">Nothing logged yet — search or scan a food</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="bg-white border border-stone-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${log.source === 'barcode' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                    <div>
                      <p className="text-sm font-medium text-stone-800 truncate">{log.foodName}</p>
                      <p className="text-xs text-stone-400 font-mono mt-0.5">
                        {log.grams}g · {Math.round(log.calories)} kcal · {Math.round(log.protein)}p · {Math.round(log.carbs)}c · {Math.round(log.fat)}f
                      </p>
                    </div>
                  </div>
                  <button onClick={() => deleteMutation.mutate(log.id)}
                    className="text-stone-300 hover:text-red-400 transition-colors shrink-0 text-lg leading-none">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {selectedFood && (
        <FoodModal
          food={selectedFood}
          onClose={() => setSelectedFood(null)}
          onAdd={(food, grams) => addMutation.mutate({ food, grams })}
        />
      )}

      {showScanner && (
        <BarcodeScanner
          onResult={(food) => { setShowScanner(false); setSelectedFood(food) }}
          onClose={() => setShowScanner(false)}
        />
      )}

      <AISuggestions
        macros={{
          targetCalories: targets.calories,
          targetProtein: targets.protein,
          targetCarbs: targets.carbs,
          targetFat: targets.fat,
        }}
        logData={logData}
        isOpen={showAI}
        onClose={() => setShowAI(false)}
      />
    </div>
  )
}