'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase'

interface ItemDetails {
  id: string
  owner_id: string
  title: string
  description: string
  category: string
  building_block: string
  listing_type: 'swap' | 'buy' | 'both'
  price: number | null
  wanted_in_exchange: string | null
  image_url: string | null
  status: string
  created_at: string
  profiles: {
    full_name: string
    hostel_block: string
    college_email: string
  }
}

export default function ItemDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [item, setItem] = useState<ItemDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [offerText, setOfferText] = useState('')
  const [submittingOffer, setSubmittingOffer] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadItemAndUser() {
      // 1. Get current logged in user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)

      // 2. Fetch target listing item details along with owner profile
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          profiles (full_name, hostel_block, college_email)
        `)
        .eq('id', resolvedParams.id)
        .single()

      if (!error && data) {
        setItem(data as unknown as ItemDetails)
      }
      setLoading(false)
    }

    loadItemAndUser()
  }, [resolvedParams.id, supabase])

  const handleMakeOffer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUserId || !item) return
    setSubmittingOffer(true)
    setMessage(null)

    // Insert structural row inside public.offers
    const { error } = await supabase.from('offers').insert({
      item_id: item.id,
      buyer_id: currentUserId,
      offer_details: offerText,
      status: 'pending'
    })

    setSubmittingOffer(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Your swap offer was sent successfully!' })
      setOfferText('')
    }
  }

  if (loading) return <div className="text-center py-12 text-[#6B85A0]">Loading item specifications...</div>
  if (!item) return <div className="text-center py-12 text-[#C97064]">Listing item not found.</div>

  const isOwner = currentUserId === item.owner_id

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-card shadow-sm border border-[#6B85A0]/10 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-8">
        
        {/* Left Side: Product Media */}
        <div className="bg-[#F6F8F7] rounded-md flex items-center justify-center min-h-[300px] border border-gray-100 relative">
          {item.image_url ? (
            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover rounded-md" />
          ) : (
            <span className="text-6xl select-none">📦</span>
          )}
          <span className="absolute top-4 right-4 bg-[#2A2F2D] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            {item.listing_type}
          </span>
        </div>

        {/* Right Side: Product Meta & Actions */}
        <div className="flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-[#5B8C72] uppercase tracking-wider">
              <span>{item.category}</span>
              <span className="text-gray-400 font-normal">Posted {new Date(item.created_at).toLocaleDateString()}</span>
            </div>
            <h1 className="text-2xl font-bold font-display text-[#2A2F2D] mt-2">{item.title}</h1>
            
            <div className="mt-4 p-4 bg-[#F6F8F7] rounded-md space-y-2 text-sm text-[#2A2F2D]">
              <p><span className="font-medium text-[#6B85A0]">Seller:</span> {item.profiles?.full_name}</p>
              <p><span className="font-medium text-[#6B85A0]">Location:</span> {item.building_block}</p>
            </div>

            <p className="text-sm text-[#6B85A0] mt-4 leading-relaxed">{item.description}</p>
          </div>

          <div className="pt-6 border-t border-gray-100">
            {item.listing_type !== 'swap' && item.price && (
              <div className="mb-4">
                <span className="text-xs text-[#6B85A0] block font-medium">Selling Price</span>
                <span className="text-3xl font-extrabold text-[#2A2F2D]">₹{item.price}</span>
              </div>
            )}

            {item.listing_type !== 'buy' && item.wanted_in_exchange && (
              <div className="mb-4 p-3 bg-[#5B8C72]/5 rounded-md border border-[#5B8C72]/10">
                <span className="text-xs text-[#5B8C72] block font-semibold uppercase tracking-wider">Desired Barter Exchange</span>
                <p className="text-sm text-[#2A2F2D] font-medium mt-0.5">Looking for: {item.wanted_in_exchange}</p>
              </div>
            )}

            {/* Contextual Action Handling Block */}
            {isOwner ? (
              <div className="p-4 bg-gray-50 rounded-md text-center border border-gray-200">
                <p className="text-xs font-medium text-[#6B85A0]">This is your own active campus listing.</p>
              </div>
            ) : (
              <form onSubmit={handleMakeOffer} className="space-y-3 mt-6">
                {message && (
                  <div className={`p-3 rounded text-xs font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-[#C97064]/10 text-[#C97064]'}`}>
                    {message.text}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-[#2A2F2D] uppercase tracking-wider mb-1">Make an Offer / Send Message</label>
                  <textarea
                    required
                    rows={3}
                    value={offerText}
                    onChange={(e) => setOfferText(e.target.value)}
                    placeholder="e.g., Hey! I have the CS book you want. Can we trade near the food court tomorrow?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5B8C72] text-[#2A2F2D] text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingOffer}
                  className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-[#5B8C72] hover:bg-[#5B8C72]/90 rounded-md shadow-sm transition-colors disabled:opacity-50"
                >
                  {submittingOffer ? 'Sending Proposal...' : 'Propose Swap / Purchase'}
                </button>
              </form>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}