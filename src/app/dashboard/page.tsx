'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase'

interface Item {
  id: string
  title: string
  description: string
  category: string
  building_block: string
  listing_type: 'Swap' | 'Buy'
  price: number
  wanted_in_exchange: string | null
  whatsapp_number: string
  image_url: string | null
  status: string
  owner_id: string
  created_at: string
}

interface Offer {
  id: string
  item_id: string
  buyer_id: string
  seller_id: string
  buyer_otp: string
  seller_otp: string
  status: string
}

export default function DashboardPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'All' | 'Swap' | 'Buy'>('All')
  const [activeTab, setActiveTab] = useState<'Marketplace' | 'MyListings'>('Marketplace')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userSession, setUserSession] = useState<any>(null)

  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [activeHandshake, setActiveHandshake] = useState<Offer | null>(null)
  const [inputBuyerOtp, setInputBuyerOtp] = useState('')
  const [inputSellerOtp, setInputSellerOtp] = useState('')
  const [verificationError, setVerificationError] = useState('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserSession(session)
    })
  }, [supabase])

  const fetchMarketplaceItems = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (err: unknown) {
      console.error('Error loading market:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchMarketplaceItems()
  }, [fetchMarketplaceItems])

  const handleProtectedAction = (actionCallback: () => void) => {
    if (!userSession) {
      router.push('/signup')
    } else {
      actionCallback()
    }
  }

  const initiateTransaction = async (item: Item) => {
    try {
      if (!userSession) return
      const buyerId = userSession.user.id
      if (buyerId === item.owner_id) {
        alert("You can't buy or swap your own item!")
        return
      }

      const generatedBuyerOtp = Math.floor(100000 + Math.random() * 900000).toString()
      const generatedSellerOtp = Math.floor(100000 + Math.random() * 900000).toString()

      const { data, error } = await supabase
        .from('offers')
        .insert([
          {
            item_id: item.id,
            buyer_id: buyerId,
            seller_id: item.owner_id,
            buyer_otp: generatedBuyerOtp,
            seller_otp: generatedSellerOtp,
            status: 'pending'
          }
        ])
        .select()
        .single()

      if (error) throw error
      setActiveHandshake(data)
      setSelectedItem(null)
      alert(`Deal initiated! Give this code to the seller to complete the trade: ${generatedBuyerOtp}`)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Something went wrong starting the transaction.')
    }
  }

  const verifyHandshake = async () => {
    if (!activeHandshake) return
    setVerificationError('')

    try {
      if (
        inputBuyerOtp !== activeHandshake.buyer_otp ||
        inputSellerOtp !== activeHandshake.seller_otp
      ) {
        throw new Error('Invalid OTP codes entered. Check the codes with the other party.')
      }

      const { error: offerError } = await supabase
        .from('offers')
        .update({ buyer_verified: true, seller_verified: true, status: 'completed' })
        .eq('id', activeHandshake.id)

      if (offerError) throw offerError

      const { error: itemError } = await supabase
        .from('items')
        .update({ status: 'sold' })
        .eq('id', activeHandshake.item_id)

      if (itemError) throw itemError

      alert('Handshake verified! Item marked as sold.')
      setActiveHandshake(null)
      setInputBuyerOtp('')
      setInputSellerOtp('')
      fetchMarketplaceItems()
    } catch (err: unknown) {
      setVerificationError(err instanceof Error ? err.message : 'Verification failed.')
    }
  }

  const deleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return
    const { error } = await supabase.from('items').delete().eq('id', id)
    if (error) alert(error.message)
    else fetchMarketplaceItems()
  }

  const displayedItems = items.filter((item) => {
    const query = searchQuery.toLowerCase()
    const matchesSearch =
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query)
    const matchesFilter = filter === 'All' || item.listing_type === filter
    const matchesTab =
      activeTab === 'Marketplace'
        ? item.status === 'available'
        : item.owner_id === userSession?.user?.id

    return matchesSearch && matchesFilter && matchesTab
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Tabs */}
      <div className="flex justify-center border-b border-gray-100 mb-6 gap-8 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('Marketplace')}
          className={`pb-3 ${
            activeTab === 'Marketplace'
              ? 'border-b-2 border-[#5B8C72] text-[#5B8C72]'
              : 'text-gray-400'
          }`}
        >
          Marketplace
        </button>
        <button
          onClick={() => handleProtectedAction(() => setActiveTab('MyListings'))}
          className={`pb-3 ${
            activeTab === 'MyListings'
              ? 'border-b-2 border-[#5B8C72] text-[#5B8C72]'
              : 'text-gray-400'
          }`}
        >
          My Listings
        </button>
      </div>

      {/* Search + filter controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <input
          type="text"
          placeholder="Search textbooks, electronics, lab coats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:max-w-md px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#5B8C72] text-gray-900 placeholder-gray-500 bg-white"
          style={{ color: '#111827' }}
        />

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          {(['All', 'Swap', 'Buy'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === t ? 'bg-[#5B8C72] text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {t === 'All' ? 'All Items' : t === 'Swap' ? 'Swaps' : 'Buys'}
            </button>
          ))}
          <button
            onClick={() => handleProtectedAction(() => router.push('/dashboard/new-listing'))}
            className="ml-2 px-4 py-2 text-xs font-bold bg-[#5B8C72] text-white rounded-lg hover:bg-[#5B8C72]/90 uppercase tracking-wider"
          >
            + Create Post
          </button>
        </div>
      </div>

      {/* Handshake widget */}
      {activeHandshake && (
        <div className="mb-8 p-6 bg-amber-50/60 border border-amber-200 rounded-2xl max-w-md mx-auto">
          <h3 className="text-sm font-bold text-amber-900 mb-1">🔐 Secure Handshake Verification</h3>
          <p className="text-xs text-amber-700 mb-4">
            Give your code to the seller and enter theirs below to finalize the trade.
          </p>
          {verificationError && (
            <p className="text-xs text-red-600 font-semibold mb-2">{verificationError}</p>
          )}
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                Your Code (Give to Seller)
              </label>
              <input
                type="text"
                disabled
                value={activeHandshake.buyer_otp}
                className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg font-mono text-center font-bold text-amber-900 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                  Confirm Your Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Buyer OTP"
                  value={inputBuyerOtp}
                  onChange={(e) => setInputBuyerOtp(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-center font-mono text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                  Enter Seller&apos;s Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Seller OTP"
                  value={inputSellerOtp}
                  onChange={(e) => setInputSellerOtp(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-center font-mono text-sm text-gray-900"
                />
              </div>
            </div>
            <button
              onClick={verifyHandshake}
              className="w-full mt-2 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg uppercase tracking-wider"
            >
              Verify &amp; Complete Deal
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <p className="text-center text-sm text-gray-500 py-12">Loading items...</p>
      ) : displayedItems.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-12">No listings found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedItems.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
            >
              <div>
                {item.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-40 object-cover rounded-xl mb-4 border border-gray-50"
                  />
                )}
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h2 className="font-bold text-gray-800 text-base line-clamp-1">{item.title}</h2>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      item.listing_type === 'Swap'
                        ? 'bg-purple-50 text-purple-600 border border-purple-100'
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}
                  >
                    {item.listing_type === 'Swap' ? '🔄 Swap' : `₹${item.price}`}
                  </span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 mb-4">{item.description}</p>
              </div>

              <div className="pt-4 border-t border-gray-50 flex flex-col gap-2">
                <div className="flex justify-between text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                  <span>📍 {item.building_block}</span>
                  <span>📦 {item.category}</span>
                </div>

                {activeTab === 'MyListings' ? (
                  <div className="flex gap-2">
                    <span
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg text-center flex-1 ${
                        item.status === 'sold'
                          ? 'bg-gray-100 text-gray-400'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {item.status === 'sold' ? 'Sold Out' : 'Active'}
                    </span>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="w-full py-2 text-xs font-bold text-center text-white bg-[#5B8C72] hover:bg-[#5B8C72]/90 rounded-lg uppercase tracking-wider"
                  >
                    View Details →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl relative">
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg"
            >
              ✕
            </button>

            {selectedItem.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedItem.image_url}
                alt={selectedItem.title}
                className="w-full h-48 object-cover rounded-2xl mb-4"
              />
            )}
            <h2 className="text-xl font-bold text-gray-900 mb-1">{selectedItem.title}</h2>
            <div className="flex gap-2 mb-4 flex-wrap">
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded">
                📍 {selectedItem.building_block}
              </span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded">
                📦 {selectedItem.category}
              </span>
              {selectedItem.listing_type === 'Swap' && selectedItem.wanted_in_exchange && (
                <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-bold rounded">
                  🔁 Wants: {selectedItem.wanted_in_exchange}
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600 mb-6 leading-relaxed">{selectedItem.description}</p>

            <div className="flex flex-col gap-2">
              {selectedItem.whatsapp_number && (
                <a
                  href={`https://wa.me/${selectedItem.whatsapp_number.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 text-center text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl uppercase tracking-wider"
                >
                  💬 Chat on WhatsApp
                </a>
              )}
              <button
                onClick={() => handleProtectedAction(() => initiateTransaction(selectedItem))}
                className="w-full py-2.5 text-xs font-bold bg-[#5B8C72] hover:bg-[#5B8C72]/90 text-white rounded-xl uppercase tracking-wider"
              >
                {selectedItem.listing_type === 'Swap' ? '🔄 Lock Swap Deal' : '🛒 Buy This Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}