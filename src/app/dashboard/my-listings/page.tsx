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
  description?: string
  building_block?: string
  whatsapp_number?: string
  image_url?: string
}

export default function MyListingsPage() {
  const [myItems, setMyItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Edit Feature States
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editListingType, setEditListingType] = useState<'swap' | 'buy' | 'both'>('swap')
  const [editPrice, setEditPrice] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editBuildingBlock, setEditBuildingBlock] = useState('')
  const [editWhatsappNumber, setEditWhatsappNumber] = useState('')

  async function fetchMyInventory() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data, error } = await supabase
        .from('items')
        .select('id, title, category, listing_type, price, status, created_at, description, building_block, whatsapp_number, image_url')
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

  // Open Edit Modal and Pre-fill details
  const startEdit = (item: Item) => {
    setEditingItem(item)
    setEditTitle(item.title || '')
    setEditCategory(item.category || '')
    setEditListingType(item.listing_type || 'swap')
    setEditPrice(item.price?.toString() || '')
    setEditDescription(item.description || '')
    setEditBuildingBlock(item.building_block || '')
    setEditWhatsappNumber(item.whatsapp_number || '')
  }

  // Submit UPDATE to Supabase row
  const handleUpdateItem = async () => {
    if (!editingItem) return

    const { error } = await supabase
      .from('items')
      .update({
        title: editTitle,
        category: editCategory,
        listing_type: editListingType,
        price: editListingType === 'swap' ? null : (parseFloat(editPrice) || 0),
        description: editDescription,
        building_block: editBuildingBlock,
        whatsapp_number: editWhatsappNumber
      })
      .eq('id', editingItem.id)

    if (!error) {
      alert('Listing updated successfully!')
      setEditingItem(null)
      fetchMyInventory()
    } else {
      alert(error.message)
    }
  }

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
          You haven&apos;t listed any items for swap or sale yet.
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
                      onClick={() => startEdit(item)}
                      className="text-xs font-semibold text-[#5B8C72] hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(item.id, item.status)}
                      className="text-xs font-semibold text-[#6B85A0] hover:underline"
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

      {/* EDIT MODAL POPUP */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-[#2A2F2D] mb-4">Edit Listing</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#6B85A0] mb-1">Item Title</label>
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5B8C72]" placeholder="e.g. Engineering Physics Textbook" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B85A0] mb-1">Category</label>
                <input type="text" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5B8C72]" placeholder="e.g. Books, Electronics, Lab Coats" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B85A0] mb-1">Listing Type</label>
                <select value={editListingType} onChange={(e) => setEditListingType(e.target.value as any)} className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5B8C72]">
                  <option value="swap">Swap (Barter)</option>
                  <option value="buy">Buy (Sale)</option>
                  <option value="both">Both</option>
                </select>
              </div>

              {editListingType !== 'swap' && (
                <div>
                  <label className="block text-xs font-semibold text-[#6B85A0] mb-1">Price (₹)</label>
                  <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5B8C72]" placeholder="Price in INR" />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#6B85A0] mb-1">Description / Condition</label>
                <textarea rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5B8C72]" placeholder="Describe item condition, requirements..." />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B85A0] mb-1">Campus Hostel Block / Location</label>
                <input type="text" value={editBuildingBlock} onChange={(e) => setEditBuildingBlock(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5B8C72]" placeholder="e.g. Block-A, Netaji Subhas Auditorium" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B85A0] mb-1">WhatsApp Contact Number</label>
                <input type="text" value={editWhatsappNumber} onChange={(e) => setEditWhatsappNumber(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5B8C72]" placeholder="Include country code, e.g. 919876543210" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingItem(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={handleUpdateItem} className="flex-1 py-2 bg-[#5B8C72] text-white rounded-lg text-sm font-medium hover:bg-[#5B8C72]/90 transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
