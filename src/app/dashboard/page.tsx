'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase'

interface Item {
  id: string
  title: string
  description: string
  category: string
  building_block: string
  listing_type: 'swap' | 'buy' | 'both'
  price: number | null
  wanted_in_exchange: string | null
  image_url: string | null
  created_at: string
  profiles: {
    full_name: string
    hostel_block: string
  }
}

export default function MarketplaceFeed() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    async function fetchMarketplaceItems() {
      setLoading(true)
      
      // Pull items from Supabase while joining the owner profile information
      let query = supabase
        .from('items')
        .select(`
          id, title, description, category, building_block, listing_type, 
          price, wanted_in_exchange, image_url, created_at,
          profiles (full_name, hostel_block)
        `)
        .eq('status', 'available')
        .order('created_at', { ascending: false })

      const { data, error } = await query

      if (!error && data) {
        setItems(data as unknown as Item[])
      }
      setLoading(false)
    }

    fetchMarketplaceItems()
  }, [supabase])

  // Client-side search and filtering logic
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
    
    const matchesType =
      typeFilter === 'all' ||
      item.listing_type === typeFilter ||
      (item.listing_type === 'both' && (typeFilter === 'swap' || typeFilter === 'buy'))

    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-8">
      {/* Search and Filters Hub */}
      <div className="bg-white p-6 rounded-card shadow-sm border border-[#6B85A0]/10 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:max-w-md">
          <input
            type="text"
            placeholder="Search textbook, electronics, lab coats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5B8C72] text-[#2A2F2D] text-sm"
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto justify-end">
          {['all', 'swap', 'buy'].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition-colors ${
                typeFilter === type
                  ? 'bg-[#5B8C72] text-white'
                  : 'bg-[#F6F8F7] text-[#6B85A0] hover:bg-gray-200'
              }`}
            >
              {type === 'all' ? 'All Trades' : `${type} only`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Content Renderer */}
      {loading ? (
        <div className="text-center py-12 text-[#6B85A0]">Loading active marketplace...</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-card border border-dashed border-gray-300">
          <p className="text-[#6B85A0]">No active campus items found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-card shadow-sm border border-[#6B85A0]/10 overflow-hidden flex flex-col group hover:shadow-md transition-shadow"
            >
              {/* Product Thumbnail Shell */}
              <div className="h-48 bg-[#F6F8F7] flex items-center justify-center relative border-b border-gray-100">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl text-[#6B85A0]/40 group-hover:scale-110 transition-transform select-none">📦</span>
                )}
                <span className="absolute top-3 right-3 bg-[#2A2F2D] text-white text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {item.listing_type === 'both' ? 'Swap / Buy' : item.listing_type}
                </span>
              </div>

              {/* Product Info Block */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-[#6B85A0] mb-1">
                    <span>{item.category}</span>
                    <span>Block: {item.building_block}</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#2A2F2D] font-display line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#6B85A0] line-clamp-2 mt-1">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    {item.listing_type !== 'swap' && item.price && (
                      <p className="text-lg font-bold text-[#2A2F2D]">
                        ₹{item.price}
                      </p>
                    )}
                    {item.listing_type !== 'buy' && item.wanted_in_exchange && (
                      <p className="text-xs text-[#5B8C72] font-medium line-clamp-1">
                        wants: {item.wanted_in_exchange}
                      </p>
                    )}
                  </div>

                  <Link
                    href={`/dashboard/items/${item.id}`}
                    className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-[#5B8C72] bg-[#5B8C72]/10 hover:bg-[#5B8C72]/20 rounded-md transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}