'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase'

export default function NewListingPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [listingType, setListingType] = useState('Swap') // 'Swap' or 'Buy'
  const [category, setCategory] = useState('Electronics')
  const [buildingBlock, setBuildingBlock] = useState('A Block')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [wantedInExchange, setWantedInExchange] = useState('')
  
  // Image upload states
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const router = useRouter()
  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImageFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMessage('')

    try {
      // 1. Authenticate user session
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('You must be logged in to create a post.')

      let uploadedImageUrl = null

      // 2. Upload file to Supabase Storage if an image was picked
      if (imageFile) {
        setUploadingImage(true)
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(filePath, imageFile)

        if (uploadError) throw uploadError

        // Get public downloadable URL
        const { data: { publicUrl } } = supabase.storage
          .from('item-images')
          .getPublicUrl(filePath)
          
        uploadedImageUrl = publicUrl
        setUploadingImage(false)
      }

      // 3. Insert listing into the items relation
      const { error } = await supabase
        .from('items')
        .insert([
          {
            title,
            description,
            category,
            building_block: buildingBlock,
            whatsapp_number: whatsappNumber,
            wanted_in_exchange: wantedInExchange.trim() || null,
            price: listingType === 'Swap' ? 0 : parseFloat(price) || 0,
            listing_type: listingType,
            owner_id: user.id,
            image_url: uploadedImageUrl,
            status: 'available'
          }
        ])

      if (error) throw error

      router.push('/dashboard')
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong while posting.')
    } finally {
      setSubmitting(false)
      setUploadingImage(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto bg-white border border-gray-100 rounded-2xl shadow-sm p-6 sm:p-8 mt-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">List an Item</h1>
        <p className="text-xs text-gray-500">Post items securely with real image uploads to your marketplace.</p>
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
            placeholder="e.g., Lab Coat or Calculator"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#5B8C72] bg-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
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
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Hostel Block Location</label>
            <select
              value={buildingBlock}
              onChange={(e) => setBuildingBlock(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#5B8C72] bg-white"
            >
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
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">WhatsApp Contact Number</label>
            <input
              type="tel"
              required
              placeholder="e.g., 9876543210"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#5B8C72] bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Upload Product Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#5B8C72]/10 file:text-[#5B8C72] hover:file:bg-[#5B8C72]/20 cursor-pointer"
            />
          </div>
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

        {listingType === 'Buy' ? (
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
        ) : (
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Wanted Item in Exchange (Optional)</label>
            <input
              type="text"
              placeholder="e.g., Looking for a Matrix Calculator or Lab Manual"
              value={wantedInExchange}
              onChange={(e) => setWantedInExchange(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#5B8C72] bg-white"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Condition & Description</label>
          <textarea
            rows={4}
            required
            placeholder="Describe your item condition, preferred meet-up times, etc..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#5B8C72] resize-none bg-white"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || uploadingImage}
          className="w-full py-3 text-xs font-bold text-white bg-[#5B8C72] hover:bg-[#5B8C72]/90 disabled:bg-gray-300 rounded-lg transition-colors tracking-wider uppercase mt-2 shadow-sm"
        >
          {uploadingImage ? 'Uploading Image...' : submitting ? 'Publishing Entry...' : 'Publish Listing'}
        </button>
      </form>
    </div>
  )
}