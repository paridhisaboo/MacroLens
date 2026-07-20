'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface ApiKeyStatus {
  hasOwnKey: boolean
  trialRemaining: number
}

export default function ApiKeySettings({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [keyInput, setKeyInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: status } = useQuery<ApiKeyStatus>({
    queryKey: ['api-key-status'],
    queryFn: async () => {
      const res = await fetch('/api/settings/api-key')
      if (!res.ok) throw new Error('Failed to load status')
      return res.json()
    },
    enabled: isOpen,
  })

  const saveMutation = useMutation({
    mutationFn: async (apiKey: string) => {
      const res = await fetch('/api/settings/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save key')
      return data
    },
    onSuccess: () => {
      setKeyInput('')
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['api-key-status'] })
    },
    onError: (err: Error) => setError(err.message),
  })

  const removeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/settings/api-key', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to remove key')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-key-status'] }),
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-stone-900 tracking-tight">AI Settings</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-sm">Close</button>
        </div>

        {status?.hasOwnKey ? (
          <div className="space-y-3">
            <p className="text-sm text-stone-600">
              You&apos;re using your own Anthropic API key for AI suggestions. Usage is billed to your account.
            </p>
            <button
              onClick={() => removeMutation.mutate()}
              disabled={removeMutation.isPending}
              className="w-full text-sm text-red-600 border border-red-200 rounded-xl px-4 py-2 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {removeMutation.isPending ? 'Removing…' : 'Remove key'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-stone-600">
              {status ? (
                status.trialRemaining > 0
                  ? `You have ${status.trialRemaining} free AI suggestion${status.trialRemaining === 1 ? '' : 's'} left. Add your own Anthropic API key for unlimited use.`
                  : 'Your free trial is used up. Add your own Anthropic API key to keep using AI features.'
              ) : 'Loading…'}
            </p>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={() => keyInput && saveMutation.mutate(keyInput)}
              disabled={!keyInput || saveMutation.isPending}
              className="w-full bg-teal-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-teal-500 transition-colors disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Verifying…' : 'Save key'}
            </button>
            <p className="text-xs text-stone-400">
              Get a key at{' '}
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="underline">
                console.anthropic.com
              </a>. Your key is encrypted and never shown again after saving.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}