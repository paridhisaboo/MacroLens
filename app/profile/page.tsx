'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface Profile {
  name: string | null
  email: string | null
  image: string | null
  heightCm: number | null
  weightKg: number | null
  dailyCalories: number
  dailyProtein: number
  dailyCarbs: number
  dailyFat: number
}

interface DayHistory {
  date: string
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  logs: {
    id: string
    foodName: string
    calories: number
    protein: number
    carbs: number
    fat: number
    grams: number
  }[]
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function Field({ label, unit, value, onChange }: { label: string; unit: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-mono uppercase tracking-widest text-stone-400">{label}</span>
      <div className="flex items-center gap-2 mt-1">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
        />
        <span className="text-sm text-stone-400 w-10">{unit}</span>
      </div>
    </label>
  )
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [days, setDays] = useState(30)

  const { data: profile } = useQuery<Profile>({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await fetch('/api/profile')
      if (!res.ok) throw new Error('Failed to load profile')
      return res.json()
    },
  })

  const { data: history, isLoading: historyLoading } = useQuery<{ days: DayHistory[] }>({
    queryKey: ['log-history', days],
    queryFn: async () => {
      const res = await fetch(`/api/log/history?days=${days}`)
      if (!res.ok) throw new Error('Failed to load history')
      return res.json()
    },
  })

  const [form, setForm] = useState({ heightCm: '', weightKg: '', dailyCalories: '', dailyProtein: '', dailyCarbs: '', dailyFat: '' })
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setForm({
        heightCm: profile.heightCm?.toString() ?? '',
        weightKg: profile.weightKg?.toString() ?? '',
        dailyCalories: profile.dailyCalories.toString(),
        dailyProtein: profile.dailyProtein.toString(),
        dailyCarbs: profile.dailyCarbs.toString(),
        dailyFat: profile.dailyFat.toString(),
      })
    }
  }, [profile])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heightCm: form.heightCm ? Number(form.heightCm) : null,
          weightKg: form.weightKg ? Number(form.weightKg) : null,
          dailyCalories: Number(form.dailyCalories),
          dailyProtein: Number(form.dailyProtein),
          dailyCarbs: Number(form.dailyCarbs),
          dailyFat: Number(form.dailyFat),
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? `Save failed (${res.status})`)
      return data
    },
    onSuccess: () => {
      setSaveError(null)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (err: Error) => setSaveError(err.message),
  })

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-stone-950 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm text-stone-400 hover:text-white transition-colors">&larr; Back to log</Link>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-sm text-macro-fat hover:text-red-400 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Account */}
        <section className="bg-white border border-stone-100 rounded-2xl p-5 sm:p-6 flex items-center gap-4 shadow-sm">
          {session?.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.user.image} alt="" className="w-14 h-14 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center text-lg font-medium text-stone-600 shrink-0">
              {session?.user?.name?.[0] ?? '?'}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-display text-lg text-stone-950 truncate">{session?.user?.name}</p>
            <p className="text-sm text-stone-400 font-mono truncate">{session?.user?.email}</p>
          </div>
        </section>

        {/* Body stats + targets */}
        <section className="bg-white border border-stone-100 rounded-2xl p-5 sm:p-6 shadow-sm">
          <h2 className="font-display italic text-lg text-stone-950 mb-4">Body stats &amp; daily targets</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Height" unit="cm" value={form.heightCm} onChange={(v) => setForm(f => ({ ...f, heightCm: v }))} />
            <Field label="Weight" unit="kg" value={form.weightKg} onChange={(v) => setForm(f => ({ ...f, weightKg: v }))} />
            <Field label="Calories" unit="kcal" value={form.dailyCalories} onChange={(v) => setForm(f => ({ ...f, dailyCalories: v }))} />
            <Field label="Protein" unit="g" value={form.dailyProtein} onChange={(v) => setForm(f => ({ ...f, dailyProtein: v }))} />
            <Field label="Carbs" unit="g" value={form.dailyCarbs} onChange={(v) => setForm(f => ({ ...f, dailyCarbs: v }))} />
            <Field label="Fat" unit="g" value={form.dailyFat} onChange={(v) => setForm(f => ({ ...f, dailyFat: v }))} />
          </div>
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-teal-500 transition-colors disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </button>
            {saveMutation.isSuccess && !saveError && <span className="text-sm text-teal-600">Saved</span>}
            {saveError && <span className="text-sm text-macro-fat">{saveError}</span>}
          </div>
        </section>

        {/* History */}
        <section className="bg-white border border-stone-100 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-display italic text-lg text-stone-950">History</h2>
            <div className="flex gap-1">
              {[30, 60, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`text-xs font-mono px-3 py-1.5 rounded-lg transition-colors ${
                    days === d ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            {historyLoading && <p className="text-sm text-stone-400">Loading…</p>}
            {!historyLoading && history?.days.length === 0 && (
              <p className="text-sm text-stone-400">No logs in this range yet.</p>
            )}
            {history?.days.map((day) => (
              <div key={day.date}>
                <div className="flex items-baseline justify-between mb-2 gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-stone-900">{formatDate(day.date)}</h3>
                  <span className="text-xs font-mono text-stone-400">
                    {Math.round(day.totalCalories)} kcal · {Math.round(day.totalProtein)}p · {Math.round(day.totalCarbs)}c · {Math.round(day.totalFat)}f
                  </span>
                </div>
                <div className="space-y-1">
                  {day.logs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between gap-3 text-sm bg-stone-50 rounded-lg px-3 py-2">
                      <span className="text-stone-700 truncate">{log.foodName}</span>
                      <span className="text-xs font-mono text-stone-400 shrink-0">{Math.round(log.calories)} kcal</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}