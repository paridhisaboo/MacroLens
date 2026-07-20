'use client'
import { useQuery } from '@tanstack/react-query'

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

  const isToday = date.toDateString() === today.toDateString()
  const isYesterday = date.toDateString() === yesterday.toDateString()

  if (isToday) return 'Today'
  if (isYesterday) return 'Yesterday'
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function HistoryModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { data, isLoading } = useQuery<{ days: DayHistory[] }>({
    queryKey: ['log-history'],
    queryFn: async () => {
      const res = await fetch('/api/log/history?days=30')
      if (!res.ok) throw new Error('Failed to load history')
      return res.json()
    },
    enabled: isOpen,
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900 tracking-tight">Past 30 Days</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-sm">Close</button>
        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-5">
          {isLoading && <p className="text-sm text-stone-400">Loading…</p>}

          {!isLoading && data?.days.length === 0 && (
            <p className="text-sm text-stone-400">No logs in the past 30 days yet.</p>
          )}

          {data?.days.map((day) => (
            <div key={day.date}>
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="text-sm font-semibold text-stone-900">{formatDate(day.date)}</h3>
                <span className="text-xs font-mono text-stone-400">
                  {Math.round(day.totalCalories)} kcal · {Math.round(day.totalProtein)}p · {Math.round(day.totalCarbs)}c · {Math.round(day.totalFat)}f
                </span>
              </div>
              <div className="space-y-1">
                {day.logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-sm bg-stone-50 rounded-lg px-3 py-2">
                    <span className="text-stone-700">{log.foodName}</span>
                    <span className="text-xs font-mono text-stone-400">{Math.round(log.calories)} kcal</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}