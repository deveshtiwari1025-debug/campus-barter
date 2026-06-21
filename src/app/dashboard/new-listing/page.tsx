'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase'

export default function NewListingPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Academics')
  const [buildingBlock, setBuildingBlock] = useState('')
  const [listingType, setListingType] = useState<'swap' | 'buy' | 'both'>('swap')
  const [price, setPrice] = useState('')
  const [wantedInExchange, setWantedInExchange] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Grab the current logged-in user session
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      setError('You must be logged in to post an item.')
      setLoading(false)
      return
    }

    // Insert structural row inside public.items
    const { error: insertError } = await supabase.from('items').insert({
      owner_id: user.id,
      title,
      description,
      category,
      building_block: buildingBlock,
      listing_type: listingType,
      price: listingType !== 'swap' && price ? parseFloat(price) : null,
      wanted_in_exchange: listingType !== 'buy' && wantedInExchange ? wantedInExchange : null,
      image_url: imageUrl || null,
      status: 'available'
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
    } else {
      // Return cleanly to main feed on successful creation
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-card shadow-sm border border-[#6B85A0]/10">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-[#2A2F2D]">Post a New Item</h2>
        <p className="text-sm text-[#6B85A0]">List your textbooks, tech, accessories, or request an exchange.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-md bg-[#C97064]/10 text-sm font-medium text-[#C97064]">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-[#2A2F2D]">Item Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Engineering Chemistry Textbook - 2nd Edition"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5B8C72] text-[#2A2F2D] text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#2A2F2D]">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5B8C72] text-[#2A2F2D] text-sm bg-white"
            >
              <option>Academics</option>
              <option>Electronics</option>
              <option>Hostel Essentials</option>
              <option>Clothing & Uniforms</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2A2F2D]">Current Location / Hostel Block</label>
            <input
              type="text"
              required
              value={buildingBlock}
              onChange={(e) => setBuildingBlock(e.target.value)}
              placeholder="e.g., Block-C, Netaji Residence"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5B8C72] text-[#2A2F2D] text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#2A2F2D]">Description</label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe item condition, usage status, or preferred meetup timings near your block..."
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5B8C72] text-[#2A2F2D] text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#2A2F2D]">What are you looking for?</label>
          <div className="mt-2 flex gap-4">
            {[
              { id: 'swap', label: 'Barter / Swap' },
              { id: 'buy', label: 'Sell for Cash' },
              { id: 'both', label: 'Accept Both' }
            ].map((type) => (
              <label key={type.id} className="flex items-center space-x-2 text-sm font-medium text-[#2A2F2D] cursor-pointer">
                <input
                  type="radio"
                  name="listingType"
                  value={type.id}
                  checked={listingType === type.id}
                  onChange={() => setListingType(type.id as 'swap' | 'buy' | 'both')}
                  className="text-[#5B8C72] focus:ring-[#5B8C72]"
                />
                <span>{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        {listingType !== 'swap' && (
          <div>
            <label className="block text-sm font-medium text-[#2A2F2D]">Price (₹)</label>
            <input
              type="number"
              required={listingType === 'buy'}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g., 450"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5B8C72] text-[#2A2F2D] text-sm"
            />
          </div>
        )}

        {listingType !== 'buy' && (
          <div>
            <label className="block text-sm font-medium text-[#2A2F2D]">Wanted in Exchange</label>
            <input
              type="text"
              required={listingType === 'swap'}
              value={wantedInExchange}
              onChange={(e) => setWantedInExchange(e.target.value)}
              placeholder="e.g., Computer Science reference book or Lab Drafter"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5B8C72] text-[#2A2F2D] text-sm"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-[#2A2F2D]">Image URL (Optional)</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/item-photo.jpg"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5B8C72] text-[#2A2F2D] text-sm"
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#5B8C72] hover:bg-[#5B8C72]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5B8C72] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating Listing...' : 'Publish Listing'}
          </button>
        </div>
      </form>
    </div>
  )
}