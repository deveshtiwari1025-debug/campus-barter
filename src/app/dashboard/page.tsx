'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase'

interface Item {
  id: string
  title: string
  description: string
  price: number
  listing_type: string
  owner_id: string
  created_at: string
}

export default function DashboardPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('All')
  
  const supabase = createClient()

  const fetchMarketplaceItems = useCallback(async () => {
    try {
      setLoading(true)
      
      // 1. Check if an active session exists first to prevent server-side auth crashes
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.log("No active auth session found yet, skipping database fetch.")
        return
      }

      // 2. Fetch the listings safely
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (err) {
      console.error('Error fetching marketplace items:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchMarketplaceItems()
  }, [fetchMarketplaceItems])

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (filterType === 'Swap Only') return matchesSearch && item.listing_type === 'Swap'
    if (filterType === 'Buy Only') return matchesSearch && item.listing_type === 'Buy'
    return matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Search & Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
        <input
          type="text"
          placeholder="Search textbook, electronics, lab coats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5B8C72]"
        />
        
        <div className="flex justify-end space-x-2">
          {['All', 'Swap Only', 'Buy Only'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterType === type
                  ? 'bg-[#5B8C72] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {type === 'All' ? 'All Trades' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Display Workspace */}
      {loading ? (
        <div className="text-center py-12 text-sm text-[#6B85A0] animate-pulse">
          Loading active marketplace...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 text-sm text-[#6B85A0]">
          No active campus posts found matching your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-800 text-base line-clamp-1">{item.title}</h3>
                  <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded ${
                    item.listing_type === 'Swap' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {item.listing_type}
                  </span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 mb-4">{item.description}</p>
              </div>
              <div className="flex justify-between items-center mt-auto pt-2 border-t border-gray-50">
                <span className="text-sm font-bold text-gray-900">
                  {item.price > 0 ? `₹${item.price}` : 'Trade'}
                </span>
                <button className="text-xs font-semibold text-[#5B8C72] hover:underline">
                  View Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}