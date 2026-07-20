'use client'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginCard() {
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') || '/'

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950 px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display italic text-4xl text-white tracking-tight">MacroLens</h1>
        <p className="text-sm text-stone-400 mt-2 mb-10">Track macros, get AI-powered suggestions.</p>

        <button
          onClick={() => signIn('google', { callbackUrl })}
          className="w-full flex items-center justify-center gap-3 bg-teal-300 hover:bg-teal-200 text-stone-950 text-sm font-medium px-4 py-3 rounded-xl transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#100E09" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"/>
            <path fill="#100E09" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.35 0-4.34-1.58-5.05-3.71H.9v2.33A9 9 0 0 0 9 18z"/>
            <path fill="#100E09" d="M3.95 10.71A5.41 5.41 0 0 1 3.67 9c0-.59.1-1.17.28-1.71V4.96H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.04l3.05-2.33z"/>
            <path fill="#100E09" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.96l3.05 2.33C4.66 5.16 6.65 3.58 9 3.58z"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-xs text-stone-600 mt-6">
          Signing in creates your own private food log — nothing is shared with other users.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginCard />
    </Suspense>
  )
}