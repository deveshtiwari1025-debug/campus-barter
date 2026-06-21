'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase'

interface Item {
  id: string
  title: string
  category: string
  listing_type: 'swap' | 'buy' | 'both'
  price: number | null
  status: 'available' | 'archived'
  created_at: string
}

export default function MyListingsPage() {
  const [myItems, setMyItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function fetchMyInventory() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data, error } = await supabase
        .from('items')
        .select('id, title, category, listing_type, price, status, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setMyItems(data as unknown as Item[])
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchMyInventory()
  }, [supabase])

  // UPDATE operation: Toggle item availability status
  const handleToggleStatus = async (itemId: string, currentStatus: 'available' | 'archived') => {
    const nextStatus = currentStatus === 'available' ? 'archived' : 'available'
    const { error } = await supabase
      .from('items')
      .update({ status: nextStatus })
      .eq('id', itemId)

    if (!error) {
      fetchMyInventory()
    }
  }

  // DELETE operation: Remove listing entirely from campus board
  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to permanently delete this listing from CampusBarter?')) return

    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId)

    if (!error) {
      setMyItems((prev) => prev.filter((item) => item.id !== itemId))
    }
  }

  if (loading) return <div className="text-center py-12 text-[#6B85A0]">Loading your inventory desk...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display text-[#2A2F2D]">My Campus Listings</h2>
          <p className="text-sm text-[#6B85A0]">Manage your active posts, toggle archiving, or remove entries.</p>
        </div>
        <Link href="/dashboard/new-listing" className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-[#5B8C72] hover:bg-[#5B8C72]/90 rounded-md shadow-sm transition-colors">
          + Post New Item
        </Link>
      </div>

      {myItems.length === 0 ? (
        <div className="bg-white p-12 rounded-card border border-dashed border-gray-300 text-center text-[#6B85A0]">
          You haven't listed any items for swap or sale yet.
        </div>
      ) : (
        <div className="bg-white rounded-card shadow-sm border border-[#6B85A0]/10 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm text-[#2A2F2D]">
            <thead className="bg-[#F6F8F7] text-xs font-semibold text-[#6B85A0] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Item Details</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Price / Terms</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {myItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-[#2A2F2D]">{item.title}</div>
                    <div className="text-xs text-[#6B85A0]">{item.category}</div>
                  </td>
                  <td className="px-6 py-4 capitalize font-medium text-[#6B85A0]">
                    {item.listing_type}
                  </td>
                  <td className="px-6 py-4 font-semibold text-[#2A2F2D]">
                    {item.price ? `₹${item.price}` : 'Barter'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${
                      item.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button
                      onClick={() => handleToggleStatus(item.id, item.status)}
                      className="text-xs font-semibold text-[#5B8C72] hover:underline"
                    >
                      {item.status === 'available' ? 'Archive' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-xs font-semibold text-[#C97064] hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}