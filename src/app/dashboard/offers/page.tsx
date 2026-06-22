'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'

export default function OffersPage() {
  const [incomingOffers, setIncomingOffers] = useState<any[]>([])
  const [outgoingOffers, setOutgoingOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function loadOffers() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Fetch raw offers directly from the database table
      const { data: rawIncoming } = await supabase
        .from('offers')
        .select('*')
        .eq('seller_id', user.id)

      const { data: rawOutgoing } = await supabase
        .from('offers')
        .select('*')
        .eq('buyer_id', user.id)

      const incomingList = rawIncoming || []
      const outgoingList = rawOutgoing || []

      // 2. Gather unique IDs for matching items and participant profiles
      const allItemIds = Array.from(new Set([
        ...incomingList.map((o: any) => o.item_id),
        ...outgoingList.map((o: any) => o.item_id)
      ])).filter(Boolean)

      const allProfileIds = Array.from(new Set([
        ...incomingList.map((o: any) => o.buyer_id),
        ...incomingList.map((o: any) => o.seller_id),
        ...outgoingList.map((o: any) => o.buyer_id),
        ...outgoingList.map((o: any) => o.seller_id)
      ])).filter(Boolean)

      const itemsMap: Record<string, any> = {}
      const profilesMap: Record<string, any> = {}

      // 3. Populate matching information stores individually
      if (allItemIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('items')
          .select('id, title, owner_id, price, wanted_in_exchange')
          .in('id', allItemIds)
        if (itemsData) {
          itemsData.forEach((item: any) => { itemsMap[item.id] = item })
        }
      }

      if (allProfileIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, college_email')
          .in('id', allProfileIds)
        if (profilesData) {
          profilesData.forEach((profile: any) => { profilesMap[profile.id] = profile })
        }
      }

      // 4. Client-side dataset binding to completely bypass compilation friction
      const mappedIncoming = incomingList.map((offer: any) => ({
        ...offer,
        items: itemsMap[offer.item_id] || { title: 'Item details unavailable', owner_id: '', price: 0, wanted_in_exchange: null },
        profiles: profilesMap[offer.buyer_id] || { full_name: 'Campus Student', college_email: 'Contact via WhatsApp' }
      }))

      const mappedOutgoing = outgoingList.map((offer: any) => ({
        ...offer,
        items: itemsMap[offer.item_id] || { title: 'Item details unavailable', owner_id: '', price: 0, wanted_in_exchange: null },
        profiles: profilesMap[offer.seller_id] || { full_name: 'Campus Seller', college_email: 'Contact via WhatsApp' }
      }))

      setIncomingOffers(mappedIncoming)
      setOutgoingOffers(mappedOutgoing)
    } catch (err) {
      console.error("Dashboard data assembly error:", err)
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
      alert(`Failed to update status: ${error.message}`)
    } else {
      loadOffers()
    }
  }

  if (loading) return <div className="text-center py-12 text-[#6B85A0]">Loading trade dashboard...</div>

  return (
    <div className="space-y-12 max-w-5xl mx-auto p-4">
      {/* Section A: Incoming Trade Proposals */}
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

                {/* Secure Verification Handshake Panel */}
                {(offer.status === 'accepted' || offer.status === 'completed') && (
                  <div className="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide">🤝 Secure Handshake Active</h4>
                    <p className="text-xs text-amber-700">Exchange verification codes with the other student in person to close out the deal.</p>
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

      {/* Section B: Sent Outgoing Trade Trackers */}
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
                  <p className="text-xs text-[#6B85A0]">Owner: {offer.profiles?.full_name || 'Campus Seller'}</p>
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
