'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [hostelBlock, setHostelBlock] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Strict Domain Enforcement
    const domain = email.split('@')[1]
    if (!domain || domain.toLowerCase() !== 'vitstudent.ac.in') {
      setError('Registration is restricted to @vitstudent.ac.in emails only.')
      setLoading(false)
      return
    }

    // Register user with Supabase Auth
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        // Store metadata profiles need directly inside user attributes
        data: {
          full_name: fullName,
          hostel_block: hostelBlock,
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data?.user) {
      setSuccess(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#F6F8F7] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-body">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <span className="text-4xl inline-block transition-transform duration-300 hover:rotate-180 cursor-default select-none">⇄</span>
        <h2 className="mt-2 text-3xl font-bold font-display text-[#2A2F2D]">
          Create your account
        </h2>
        <p className="mt-2 text-sm text-[#6B85A0]">
          Connect with students across your campus blocks
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm rounded-card sm:px-10 border border-[#6B85A0]/10">
          {success ? (
            <div className="rounded-md bg-[#5B8C72]/10 p-4 text-center">
              <p className="text-sm font-medium text-[#5B8C72]">
                Verification link sent! Check your college inbox to activate your profile.
              </p>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSignup}>
              {error && (
                <div className="rounded-md bg-[#C97064]/10 p-4">
                  <p className="text-sm font-medium text-[#C97064]">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#2A2F2D]">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5B8C72] text-[#2A2F2D]"
                  placeholder="e.g., John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2A2F2D]">Hostel Block</label>
                <input
                  type="text"
                  required
                  value={hostelBlock}
                  onChange={(e) => setHostelBlock(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5B8C72] text-[#2A2F2D]"
                  placeholder="e.g., A-Block, D-Block"
                />
              </div>

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
                  {loading ? 'Creating profile...' : 'Sign Up'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-[#6B85A0]">
              Already registered?{' '}
              <Link href="/login" className="font-medium text-[#5B8C72] hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}