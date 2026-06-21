'use client'
export const dynamic = 'force-dynamic'
import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#F6F8F7] flex flex-col font-body">
      {/* Universal Campus Navigation Header */}
      <header className="bg-white border-b border-[#6B85A0]/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="flex items-center space-x-2 text-xl font-bold font-display text-[#2A2F2D] hover:opacity-90">
                <span className="text-2xl transition-transform duration-300 hover:rotate-180">⇄</span>
                <span>CampusBarter</span>
              </Link>
              <nav className="hidden md:flex space-x-6 text-sm font-medium">
                <Link href="/dashboard" className="text-[#2A2F2D] hover:text-[#5B8C72] transition-colors">
                  Marketplace
                </Link>
                <Link href="/dashboard/my-listings" className="text-[#6B85A0] hover:text-[#5B8C72] transition-colors">
                  My Items
                </Link>
                <Link href="/dashboard/offers" className="text-[#6B85A0] hover:text-[#5B8C72] transition-colors">
                  Offers & Chat
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard/new-listing" className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-[#5B8C72] hover:bg-[#5B8C72]/90 rounded-md shadow-sm transition-colors">
                + Post Item
              </Link>
              <button
                onClick={handleSignOut}
                className="text-sm font-medium text-[#C97064] hover:text-[#C97064]/80 px-3 py-2 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Reactive Subpage Shell Injector */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}