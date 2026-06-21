'use client'

export const dynamic = 'force-dynamic'

import React from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (path: string) => pathname === path

  return (
    <div className="min-h-screen bg-[#F6F8F7] flex flex-col font-sans">
      {/* Campus Header Navbar */}
      <header className="bg-white border-b border-[#6B85A0]/10 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="text-xl font-bold text-[#2A2F2D] tracking-tight flex items-center space-x-2">
              <span className="text-[#5B8C72]">🤝</span>
              <span>CampusBarter</span>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex space-x-1 text-sm font-medium">
              <Link
                href="/dashboard"
                className={`px-3 py-2 rounded-md transition-colors ${
                  isActive('/dashboard')
                    ? 'bg-[#5B8C72]/10 text-[#5B8C72]'
                    : 'text-[#6B85A0] hover:text-[#2A2F2D] hover:bg-gray-50'
                }`}
              >
                Marketplace
              </Link>
              <Link
                href="/dashboard/my-listings"
                className={`px-3 py-2 rounded-md transition-colors ${
                  isActive('/dashboard/my-listings')
                    ? 'bg-[#5B8C72]/10 text-[#5B8C72]'
                    : 'text-[#6B85A0] hover:text-[#2A2F2D] hover:bg-gray-50'
                }`}
              >
                My Listings
              </Link>
              <Link
                href="/dashboard/offers"
                className={`px-3 py-2 rounded-md transition-colors ${
                  isActive('/dashboard/offers')
                    ? 'bg-[#5B8C72]/10 text-[#5B8C72]'
                    : 'text-[#6B85A0] hover:text-[#2A2F2D] hover:bg-gray-50'
                }`}
              >
                Offers Desk
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard/new-listing"
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-[#5B8C72] hover:bg-[#5B8C72]/90 rounded-md transition-colors shadow-sm"
            >
              + Create Post
            </Link>
            
            <button
              onClick={handleSignOut}
              className="text-xs font-semibold text-[#C97064] hover:bg-[#C97064]/5 px-3 py-2 rounded-md transition-colors border border-[#C97064]/10"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden bg-white border-b border-gray-100 px-4 py-2 flex justify-around text-xs font-medium text-[#6B85A0]">
        <Link href="/dashboard" className={isActive('/dashboard') ? 'text-[#5B8C72] font-bold' : ''}>
          Marketplace
        </Link>
        <Link href="/dashboard/my-listings" className={isActive('/dashboard/my-listings') ? 'text-[#5B8C72] font-bold' : ''}>
          My Listings
        </Link>
        <Link href="/dashboard/offers" className={isActive('/dashboard/offers') ? 'text-[#5B8C72] font-bold' : ''}>
          Offers
        </Link>
        <Link href="/dashboard/new-listing" className={isActive('/dashboard/new-listing') ? 'text-[#5B8C72] font-bold' : ''}>
          + Post
        </Link>
      </div>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}