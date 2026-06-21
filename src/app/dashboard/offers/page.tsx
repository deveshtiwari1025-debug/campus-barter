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

    // 1. Fetch incoming proposals where the current user owns the listing item
    const { data: incoming } = await supabase
      .from('offers')
      .select(`
        *,
        items!inner (title, owner_id, price, wanted_in_exchange),
        profiles:buyer_id (full_name, college_email)
      `)
      .eq('items.owner_id', user.id)
      .order('created_at', { ascending: false })

    // 2. Fetch outgoing proposals sent by the current user
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
    setLoading(false)
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
      // Re-trigger query fetch to cleanly update visual board states
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
              <div key={offer.id} className="bg-white p-6 rounded-card shadow-sm border border-[#6B85A0]/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-700">{offer.status}</span>
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
                
                <div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    offer.status === 'accepted' ? 'bg-green-100 text-green-800' :
                    offer.status === 'declined' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {offer.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}