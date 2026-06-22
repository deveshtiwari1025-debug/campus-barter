'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'

interface Offer {
  id: string
  item_id: string
  buyer_id: string
  seller_id: string
  offer_details: string
  status: 'pending' | 'accepted' | 'declined' | 'completed'
  created_at: string
  buyer_otp: string
  seller_otp: string
  items: {
    title: string
    owner_id: string
    price: number | null
    wanted_in_exchange: string | null
  } | null
  profiles: {
    full_name: string
    college_email: string
  } | null
}

export default function OffersPage() {
  const [incomingOffers, setIncomingOffers] = useState<Offer[]>([])
  const [outgoingOffers, setOutgoingOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function loadOffers() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Fetch raw offers data directly (Guaranteed to work based on diagnostics)
      const { data: rawIncoming } = await supabase
        .from('offers')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })

      const { data: rawOutgoing } = await supabase
        .from('offers')
        .select('*')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })

      const incomingList = rawIncoming || []
      const outgoingList = rawOutgoing || []

      // 2. Gather all unique item and profile IDs needed for this page
      const allItemIds = Array.from(new Set([...incomingList.map(o => o.item_id), ...outgoingList.map(o => o.item_id)]))
      const allBuyerIds = Array.from(new Set([...incomingList.map(o => o.buyer_id), ...outgoingList.map(o => o.buyer_id)]))

      // 3. Fetch details individually to completely bypass missing foreign key relation errors
      let itemsMap: Record<string, any> = {}
      let profilesMap: Record<string, any> = {}

      if (allItemIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('items')
          .select('id, title, owner_id, price, wanted_in_exchange')
          .in('id', allItemIds)
        
        if (itemsData) {
          itemsData.forEach(item => { itemsMap[item.id] = item })
        }
      }

      if (allBuyerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, college_email')
          .in('id', allBuyerIds)
        
        if (profilesData) {
          profilesData.forEach(profile => { profilesMap[profile.id] = profile })
        }
      }

      // 4. Combine raw data with lookup details in client-side memory
      const mappedIncoming = incomingList.map(offer => ({
        ...offer,
        items: itemsMap[offer.item_id] || { title: 'Unknown Product Item', owner_id: '', price: 0, wanted_in_exchange: null },
        profiles: profilesMap[offer.buyer_id] || { full_name: 'Campus Student', college_email: 'Student Email' }
      })) as Offer[]

      const mappedOutgoing = outgoingList.map(offer => ({
        ...offer,
        items: itemsMap[offer.item_id] || { title: 'Unknown Product Item', owner_id: '', price: 0, wanted_in_exchange: null },
        profiles: profilesMap[offer.buyer_id] || { full_name: 'Campus Student', college_email: 'Student Email' }
      })) as Offer[]

      setIncomingOffers(mappedIncoming)
      setOutgoingOffers(mappedOutgoing)
    } catch (err) {
      console.error("Dashboard stitching error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOffers()
  }, [supabase])

  const handleUpdateStatus = async (offerId: string, nextStatus: 'accepted' | 'declined') => {
    const { error } = await supabase
      .from('offers')
      .update({ status: nextStatus })
      .eq('id', offerId)

    if (error) {
      alert(`Failed to update deal status: ${error.message}`)
    } else {
      loadOffers()
    }
  }

  if (loading) return <div className="text-center py-12 text-[#6B85A0]">Loading trade dashboard...</div>

  return (
    <div className="space-y-12 max-w-5xl mx-auto p-4">
      {/* Section A: Incoming Barter Proposals */}
      <div>
        <h2 className="text-xl font-bold text-[#2A2F2D] mb-4">Incoming Offers</h2>
        {incomingOffers.length === 0 ? (
          <div className="bg-white p-6 rounded-xl border border-dashed border-gray-300 text-center text-[#6B85A0] text-sm">
            No trade proposals have been received for your campus listings yet.
          </div>
        ) : (
          <div className="space-y-4">
            {incomingOffers.map((offer) => (
              <div key={offer.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        offer.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        offer.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
                      }`}>{offer.status}</span>
                      <span className="text-sm font-bold text-[#2A2F2D]">Item: {offer.items?.title}</span>
                    </div>
                    {offer.offer_details && (
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-100 italic">
                        "{offer.offer_details}"
                      </p>
                    )}
                    <p className="text-xs text-[#6B85A0]">
                      Proposed by <span className="font-medium text-[#2A2F2D]">{offer.profiles?.full_name}</span> ({offer.profiles?.college_email})
                    </p>
                  </div>

                  {offer.status === 'pending' && (
                    <div className="flex items-center space-x-2 self-end md:self-center">
                      <button
                        onClick={() => handleUpdateStatus(offer.id, 'accepted')}
                        className="px-4 py-1.5 bg-[#5B8C72] text-white text-xs font-medium rounded hover:bg-[#5B8C72]/90 transition-colors"
                      >
                        Accept Trade
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(offer.id, 'declined')}
                        className="px-4 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded hover:bg-red-100 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>

                {/* Secure Handshake verification block for Seller */}
                {(offer.status === 'accepted' || offer.status === 'completed') && (
                  <div className="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide">🤝 Secure Handshake Active</h4>
                    <p className="text-xs text-amber-700">Exchange codes with the student in person to settle the transaction.</p>
                    <div className="flex items-center space-x-6 pt-1">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-gray-400">Your Code (Give to Buyer)</span>
                        <span className="text-lg font-mono font-bold text-amber-900">{offer.seller_otp || '------'}</span>
                      </div>
                      <div className="border-l border-amber-300 h-8"></div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-gray-400">Expected Buyer Code</span>
                        <span className="text-lg font-mono font-bold text-gray-600">{offer.buyer_otp || '------'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section B: Outgoing Trade Trackers */}
      <div>
        <h2 className="text-xl font-bold text-[#2A2F2D] mb-4">Sent Proposals</h2>
        {outgoingOffers.length === 0 ? (
          <div className="bg-white p-6 rounded-xl border border-dashed border-gray-300 text-center text-[#6B85A0] text-sm">
            You haven't initiated any trade proposals to other students yet.
          </div>
        ) : (
          <div className="space-y-4">
            {outgoingOffers.map((offer) => (
              <div key={offer.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#2A2F2D]">Target Item: {offer.items?.title}</h3>
                  {offer.offer_details && <p className="text-sm text-gray-500 italic">Your message: "{offer.offer_details}"</p>}
                  <p className="text-xs text-[#6B85A0]">Sent on {new Date(offer.created_at).toLocaleDateString()}</p>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    offer.status === 'accepted' ? 'bg-green-100 text-green-800' :
                    offer.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    offer.status === 'declined' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {offer.status}
                  </span>
                  {(offer.status === 'accepted' || offer.status === 'completed') && (
                    <span className="text-xs font-mono bg-amber-50 border border-amber-200 px-2 py-1 rounded text-amber-900 font-bold">
                      Your Verification Code: {offer.buyer_otp}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}