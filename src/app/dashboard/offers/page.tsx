'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'

interface Offer {
  id: string
  item_id: string
  buyer_id: string
  offer_details: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  buyer_otp?: string;  // Added for verification
  seller_otp?: string; // Added for verification
  items: {
    title: string
    owner_id: string
    price: number | null
    wanted_in_exchange: string | null
  }
  profiles: {
    full_name: string
    college_email: string
  }
}

export default function OffersPage() {
  const [incomingOffers, setIncomingOffers] = useState<Offer[]>([])
  const [outgoingOffers, setOutgoingOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function loadOffers() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    // Fetch incoming proposals where the current user owns the listing item
    const { data: incoming } = await supabase
      .from('offers')
      .select(`
        *,
        items!inner (title, owner_id, price, wanted_in_exchange),
        profiles:buyer_id (full_name, college_email)
      `)
      .eq('items.owner_id', user.id)
      .order('created_at', { ascending: false })

    // Fetch outgoing proposals sent by the current user
    const { data: outgoing } = await supabase
      .from('offers')
      .select(`
        *,
        items (title, owner_id, price, wanted_in_exchange),
        profiles:buyer_id (full_name, college_email)
      `)
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false })

    if (incoming) setIncomingOffers(incoming as unknown as Offer[])
    if (outgoing) setOutgoingOffers(outgoing as unknown as Offer[])
    loading && setLoading(false)
  }

  useEffect(() => {
    loadOffers()
  }, [supabase])

  const handleUpdateStatus = async (offerId: string, nextStatus: 'accepted' | 'declined') => {
    const { error } = await supabase
      .from('offers')
      .update({ status: nextStatus })
      .eq('id', offerId)

    if (!error) {
      loadOffers()
    }
  }

  if (loading) return <div className="text-center py-12 text-[#6B85A0]">Loading trade dashboard...</div>

  return (
    <div className="space-y-12">
      {/* Section A: Incoming Barter Proposals */}
      <div>
        <h2 className="text-xl font-bold font-display text-[#2A2F2D] mb-4">Incoming Offers</h2>
        {incomingOffers.length === 0 ? (
          <div className="bg-white p-6 rounded-card border border-dashed border-gray-300 text-center text-[#6B85A0] text-sm">
            No pending barter proposals have been received for your campus listings yet.
          </div>
        ) : (
          <div className="space-y-4">
            {incomingOffers.map((offer) => (
              <div key={offer.id} className="bg-white p-6 rounded-card shadow-sm border border-[#6B85A0]/10 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                        offer.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                      }`}>{offer.status}</span>
                      <span className="text-sm font-bold text-[#2A2F2D]">Item: {offer.items?.title}</span>
                    </div>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-100 italic">
                      "{offer.offer_details}"
                    </p>
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
                        className="px-4 py-1.5 bg-[#C97064]/10 text-[#C97064] text-xs font-medium rounded hover:bg-[#C97064]/20 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>

                {/* Handshake Verification UI for the Seller */}
                {offer.status === 'accepted' && (
                  <div className="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-md space-y-2">
                    <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide">🤝 Secure Handshake Active</h4>
                    <p className="text-xs text-amber-700"> Give your code to the buyer to complete verification.</p>
                    <div className="flex items-center space-x-4 pt-1">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-gray-500">Your Seller Code</span>
                        <span className="text-lg font-mono font-bold text-amber-900">{offer.seller_otp || 'N/A'}</span>
                      </div>
                      <div className="border-l border-amber-300 h-8"></div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-gray-500">Expected Buyer Code</span>
                        <span className="text-lg font-mono font-bold text-gray-700">{offer.buyer_otp || 'Pending...'}</span>
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
        <h2 className="text-xl font-bold font-display text-[#2A2F2D] mb-4">Sent Proposals</h2>
        {outgoingOffers.length === 0 ? (
          <div className="bg-white p-6 rounded-card border border-dashed border-gray-300 text-center text-[#6B85A0] text-sm">
            You haven't initiated any trade proposals to other students yet.
          </div>
        ) : (
          <div className="space-y-4">
            {outgoingOffers.map((offer) => (
              <div key={offer.id} className="bg-white p-6 rounded-card shadow-sm border border-[#6B85A0]/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#2A2F2D]">Target Item: {offer.items?.title}</h3>
                  <p className="text-sm text-gray-500 italic">Your message: "{offer.offer_details}"</p>
                  <p className="text-xs text-[#6B85A0]">Sent on {new Date(offer.created_at).toLocaleDateString()}</p>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    offer.status === 'accepted' ? 'bg-green-100 text-green-800' :
                    offer.status === 'declined' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {offer.status}
                  </span>
                  {offer.status === 'accepted' && (
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">Your OTP: {offer.buyer_otp}</span>
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