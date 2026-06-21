'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    // Automatically redirect users landing on "/" straight into the dashboard
    router.push('/dashboard')
  }, [router])

  return (
    <div className="min-h-screen bg-[#F6F8F7] flex items-center justify-center">
      <div className="text-sm font-medium text-[#6B85A0] animate-pulse">
        Loading CampusBarter Workspace...
      </div>
    </div>
  )
}