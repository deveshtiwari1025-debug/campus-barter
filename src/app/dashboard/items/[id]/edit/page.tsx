'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditListingPage({ params }: PageProps) {
  const [id, setId] = useState<string>('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [listingType, setListingType] = useState('Swap')
  const [category, setCategory] = useState('Electronics')
  const [buildingBlock, setBuildingBlock] = useState('A Block')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [wantedInExchange, setWantedInExchange] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const resolvedParams = await params
      setId(resolvedParams.id)

      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', resolvedParams.id)
        .single()

      if (error || !data) { router.push('/dashboard'); return }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.id !== data.owner_id) { router.push('/dashboard'); return }

      setTitle(data.title || '')
      setDescription(data.description || '')
      setPrice(data.price?.toString() || '')
      setListingType(data.listing_type || 'Swap')
      setCategory(data.category || 'Electronics')
      setBuildingBlock(data.building_block || 'A Block')
      setWhatsappNumber(data.whatsapp_number || '')
      setWantedInExchange(data.wanted_in_exchange || '')
      setExistingImageUrl(data.image_url || null)
      setLoading(false)
    }
    init()
  }, [params, supabase, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMessage('')

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('You must be logged in.')

      let uploadedImageUrl = existingImageUrl

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(fileName, imageFile)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage
          .from('item-images')
          .getPublicUrl(fileName)
        uploadedImageUrl = publicUrl
      }

      const { error } = await supabase
        .from('items')
        .update({
          title,
          description,
          category,
          building_block: buildingBlock,
          whatsapp_number: whatsappNumber,
          wanted_in_exchange: wantedInExchange.trim() || null,
          price: listingType === 'Swap' ? 0 : parseFloat(price) || 0,
          listing_type: listingType,
          image_url: uploadedImageUrl,
        })
        .eq('id', id)

      if (error) throw error
      window.location.href = '/dashboard'
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="max-w-xl mx-auto p-8 mt-4 text-center text-gray-500 text-sm">Loading listing...</div>
  }

  return (
    <div className="max-w-xl mx-auto bg-white border border-gray-100 rounded-2xl shadow-sm p-6 sm:p-8 mt-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Edit Listing</h1>
        <p className="text-xs text-gray-500">Update your item details below.</p>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 text-xs font-medium text-red-600 rounded-lg">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Item Name / Title</label>
          <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
            style={{ color: '#111827' }}
            className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5B8C72] bg-white" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#5B8C72] bg-white">
              <option value="Electronics">Electronics</option>
              <option value="Books">Books &amp; Textbooks</option>
              <option value="Lab Gear">Lab Gear &amp; Aprons</option>
              <option value="Hostel Essentials">Hostel Essentials</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Hostel Block</label>
            <select value={buildingBlock} onChange={(e) => setBuildingBlock(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#5B8C72] bg-white">
              <option value="A Block">A Block</option>
              <option value="B Block">B Block</option>
              <option value="C Block">C Block</option>
              <option value="D Block">D Block</option>
              <option value="E Block">E Block</option>
              <option value="F Block">F Block</option>
              <option value="Day Scholar">Day Scholar</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">WhatsApp Number</label>
            <input type="tel" required value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)}
              style={{ color: '#111827' }}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5B8C72] bg-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              {existingImageUrl ? 'Replace Image (optional)' : 'Upload Image (optional)'}
            </label>
            {existingImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={existingImageUrl} alt="current item" className="w-16 h-16 object-cover rounded-lg mb-2 border border-gray-100" />
            )}
            <input type="file" accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#5B8C72]/10 file:text-[#5B8C72] hover:file:bg-[#5B8C72]/20 cursor-pointer" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Listing Type</label>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setListingType('Swap')}
              className={`py-2.5 rounded-lg text-sm font-semibold border transition-all ${listingType === 'Swap' ? 'border-[#5B8C72] bg-[#5B8C72]/5 text-[#5B8C72]' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
              🔄 Swap / Trade
            </button>
            <button type="button" onClick={() => setListingType('Buy')}
              className={`py-2.5 rounded-lg text-sm font-semibold border transition-all ${listingType === 'Buy' ? 'border-[#5B8C72] bg-[#5B8C72]/5 text-[#5B8C72]' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
              💰 Sell / Cash
            </button>
          </div>
        </div>

        {listingType === 'Buy' ? (
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Price (₹)</label>
            <input type="number" required min="0" value={price} onChange={(e) => setPrice(e.target.value)}
              style={{ color: '#111827' }}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5B8C72] bg-white" />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Wanted in Exchange (optional)</label>
            <input type="text" value={wantedInExchange} onChange={(e) => setWantedInExchange(e.target.value)}
              style={{ color: '#111827' }}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5B8C72] bg-white" />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Condition &amp; Description</label>
          <textarea rows={4} required value={description} onChange={(e) => setDescription(e.target.value)}
            style={{ color: '#111827' }}
            className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5B8C72] resize-none bg-white" />
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => router.push('/dashboard')}
            className="flex-1 py-3 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors tracking-wider uppercase">
            Cancel
          </button>
          <button type="submit" disabled={submitting}
            className="flex-1 py-3 text-xs font-bold text-white bg-[#5B8C72] hover:bg-[#5B8C72]/90 disabled:bg-gray-300 rounded-lg transition-colors tracking-wider uppercase shadow-sm">
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
