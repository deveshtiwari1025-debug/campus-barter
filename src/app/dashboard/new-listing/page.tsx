'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase'

export default function NewListingPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [listingType, setListingType] = useState('Swap') // 'Swap' or 'Buy'
  const [category, setCategory] = useState('Electronics') // Default category choice
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMessage('')

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('You must be logged in to create a post.')

      // Insert record including the required category column
      const { error } = await supabase
        .from('items')
        .insert([
          {
            title,
            description,
            category,
            price: listingType === 'Swap' ? 0 : parseFloat(price) || 0,
            listing_type: listingType,
            owner_id: user.id
          }
        ])

      if (error) throw error

      router.push('/dashboard')
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong while posting.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto bg-white border border-gray-100 rounded-2xl shadow-sm p-6 sm:p-8 mt-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">List an Item</h1>
        <p className="text-xs text-gray-500">Post your textbooks, tools, or items for trade around blocks.</p>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 text-xs font-medium text-red-600 rounded-lg">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Item Name / Title</label>
          <input
            type="text"
            required
            placeholder="e.g., Engineering Graphics Textbook"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#5B8C72] bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#5B8C72] bg-white"
          >
            <option value="Electronics">Electronics</option>
            <option value="Books">Books & Textbooks</option>
            <option value="Lab Gear">Lab Gear & Aprons</option>
            <option value="Hostel Essentials">Hostel Essentials</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Listing Strategy Type</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setListingType('Swap')}
              className={`py-2.5 rounded-lg text-sm font-semibold border transition-all ${
                listingType === 'Swap'
                  ? 'border-[#5B8C72] bg-[#5B8C72]/5 text-[#5B8C72]'
                  : 'border-gray-200 hover:bg-gray-50 text-gray-600'
              }`}
            >
              🔄 Swap / Trade
            </button>
            <button
              type="button"
              onClick={() => setListingType('Buy')}
              className={`py-2.5 rounded-lg text-sm font-semibold border transition-all ${
                listingType === 'Buy'
                  ? 'border-[#5B8C72] bg-[#5B8C72]/5 text-[#5B8C72]'
                  : 'border-gray-200 hover:bg-gray-50 text-gray-600'
              }`}
            >
              💰 Sell / Cash
            </button>
          </div>
        </div>

        {listingType === 'Buy' && (
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Price (₹)</label>
            <input
              type="number"
              required
              min="0"
              placeholder="e.g., 450"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#5B8C72] bg-white"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Condition & Description</label>
          <textarea
            rows={4}
            required
            placeholder="Describe your item condition, block location, or preferred trade options..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#5B8C72] resize-none bg-white"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 text-xs font-bold text-white bg-[#5B8C72] hover:bg-[#5B8C72]/90 disabled:bg-gray-300 rounded-lg transition-colors tracking-wider uppercase mt-2 shadow-sm"
        >
          {submitting ? 'Publishing Entry...' : 'Publish Listing'}
        </button>
      </form>
    </div>
  )
}