'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data?.user) {
      // Direct them cleanly to the main dashboard workspace
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F8F7] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-body">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <span className="text-4xl inline-block transition-transform duration-300 hover:rotate-180 cursor-default select-none">⇄</span>
        <h2 className="mt-2 text-3xl font-bold font-display text-[#2A2F2D]">
          Welcome back
        </h2>
        <p className="mt-2 text-sm text-[#6B85A0]">
          Sign in to view active campus trades
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm rounded-card sm:px-10 border border-[#6B85A0]/10">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="rounded-md bg-[#C97064]/10 p-4">
                <p className="text-sm font-medium text-[#C97064]">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#2A2F2D]">College Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5B8C72] text-[#2A2F2D]"
                placeholder="username@vitstudent.ac.in"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2A2F2D]">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5B8C72] text-[#2A2F2D]"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#5B8C72] hover:bg-[#5B8C72]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5B8C72] disabled:opacity-50 transition-colors"
              >
                {loading ? 'Verifying access...' : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-[#6B85A0]">
              New to the platform?{' '}
              <Link href="/signup" className="font-medium text-[#5B8C72] hover:underline">
                Create an account here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}