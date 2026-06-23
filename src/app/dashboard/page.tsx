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
  image_urls: string[] | null
  status: string
  owner_id: string
  created_at: string
  expires_at: string 
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

function CameraPlaceholder() {
  return (
    <div className="w-full h-full bg-[#F6F8F7] flex flex-col items-center justify-center space-y-1 p-4 select-none">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24" 
        strokeWidth={1.5} 
        stroke="currentColor" 
        className="w-6 h-6 text-gray-300"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
      </svg>
      <span className="text-[10px] font-medium text-gray-400">No photo uploaded</span>
    </div>
  )
}

export default function DashboardPage() {
  const [items, setItems] = useState<Item[]>([])
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'All' | 'Swap' | 'Buy'>('All')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [activeTab, setActiveTab] = useState<'Marketplace' | 'MyListings'>('Marketplace')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userSession, setUserSession] = useState<any>(null)

  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0)
  const [activeHandshake, setActiveHandshake] = useState<Offer | null>(null)
  const [inputBuyerOtp, setInputBuyerOtp] = useState('')
  const [inputSellerOtp, setInputSellerOtp] = useState('')
  const [verificationError, setVerificationError] = useState('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setCurrentImageIndex(0)
  }, [selectedItem])

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession()
      setUserSession(data.session)
    }
    getSession()
  }, [supabase])

  const fetchWishlist = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('wishlists')
        .select('item_id')
        .eq('user_id', userId)

      if (error) throw error
      setWishlistedIds(new Set(data?.map((w) => w.item_id) || []))
    } catch (err) {
      console.error('Error loading wishlist mapping:', err)
    }
  }, [supabase])

  const fetchMarketplaceItems = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .gt('expires_at', new Date().toISOString()) 
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

  useEffect(() => {
    if (userSession?.user?.id) {
      fetchWishlist(userSession.user.id)
    } else {
      setWishlistedIds(new Set())
    }
  }, [userSession, fetchWishlist])

  const handleProtectedAction = (actionCallback: () => void) => {
    if (!userSession) {
      router.push('/login')
    } else {
      actionCallback()
    }
  }

  const toggleWishlist = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation()
    if (!userSession) {
      router.push('/login')
      return
    }

    const userId = userSession.user.id
    const isCurrentlyWishlisted = wishlistedIds.has(itemId)

    try {
      if (isCurrentlyWishlisted) {
        const { error } = await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', userId)
          .eq('item_id', itemId)

        if (error) throw error
        setWishlistedIds((prev) => {
          const updated = new Set(prev)
          updated.delete(itemId)
          return updated
        })
      } else {
        const { error } = await supabase
          .from('wishlists')
          .insert([{ user_id: userId, item_id: itemId }])

        if (error) throw error
        setWishlistedIds((prev) => {
          const updated = new Set(prev)
          updated.add(itemId)
          return updated
        })
      }
    } catch (err) {
      console.error('Error updating wishlist state:', err)
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
    const matchesCategory =
      selectedCategory === 'All' || 
      item.category.toLowerCase() === selectedCategory.toLowerCase()
    const matchesTab =
      activeTab === 'Marketplace'
        ? item.status === 'available'
        : item.owner_id === userSession?.user?.id

    return matchesSearch && matchesFilter && matchesCategory && matchesTab
  })

  const newlyListedItems = items
    .filter((item) => item.status === 'available')
    .slice(0, 2)

  const categories = ['All', 'Books', 'Electronics', 'Lab Gear', 'Hostel Essentials', 'Other']

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 text-gray-900">
      <div className="w-full mb-4">
        <input
          type="text"
          placeholder="Search textbooks, electronics, lab coats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-5 py-3 text-sm bg-[#F9FAFB] border border-gray-100 rounded-xl focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#5B8C72] placeholder-gray-400 text-gray-900"
        />
      </div>

      <div className="flex items-center justify-between gap-2 mb-8">
        <div className="flex items-center gap-1.5 bg-gray-100/70 p-1 rounded-xl">
          {(['All', 'Swap', 'Buy'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === t 
                  ? 'bg-[#5B8C72] text-white shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t === 'All' ? 'All Items' : t === 'Swap' ? 'Swaps' : 'Buys'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-6 text-xs font-bold border-b border-transparent">
            <button
              onClick={() => setActiveTab('Marketplace')}
              className={`pb-1 ${activeTab === 'Marketplace' ? 'text-[#5B8C72] border-b-2 border-[#5B8C72]' : 'text-gray-400'}`}
            >
              Marketplace
            </button>
            <button
              onClick={() => handleProtectedAction(() => setActiveTab('MyListings'))}
              className={`pb-1 ${activeTab === 'MyListings' ? 'text-[#5B8C72] border-b-2 border-[#5B8C72]' : 'text-gray-400'}`}
            >
              My Listings
            </button>
          </div>
          <button
            onClick={() => handleProtectedAction(() => router.push('/dashboard/new-listing'))}
            className="px-4 py-2 text-xs font-bold bg-[#5B8C72] text-white rounded-xl hover:bg-[#4a735d] transition-colors uppercase tracking-wider shadow-sm"
          >
            + Create Post
          </button>
        </div>
      </div>

      {activeHandshake && (
        <div className="mb-8 p-6 bg-amber-50/70 border border-amber-200 rounded-2xl max-w-md mx-auto">
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

      {activeTab === 'Marketplace' && (
        <>
          <div className="mb-8">
            <div className="flex justify-between items-baseline mb-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                ✨ Newly Listed
              </h2>
              <span className="text-xs text-gray-400 font-medium">Fresh from campus creators</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {newlyListedItems.map((item) => {
                const images = item.image_urls && item.image_urls.length > 0
                  ? item.image_urls
                  : item.image_url ? [item.image_url] : []

                return (
                  <div
                    key={`newly-${item.id}`}
                    onClick={() => setSelectedItem(item)}
                    className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative group"
                  >
                    <div className="w-full h-40 rounded-xl overflow-hidden bg-gray-50 mb-3 relative border border-gray-50">
                      {images.length > 0 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={images[0]} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <CameraPlaceholder />
                      )}
                      
                      <button
                        onClick={(e) => toggleWishlist(e, item.id)}
                        className="absolute top-2.5 right-2.5 z-10 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-all scale-100 active:scale-95"
                      >
                        {wishlistedIds.has(item.id) ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-500">
                            <path d="M11.645 20.91l-.007-.003-.003-.001a11.4 11.4 0 01-.507-.375c-.325-.252-.776-.624-1.285-1.114-1.022-.983-2.311-2.433-3.21-4.138-.9-1.705-1.233-3.413-1.127-4.994.105-1.579.914-3.055 2.222-3.874a4.124 4.124 0 015.42.545l.624.624.624-.624a4.124 4.124 0 015.42-.545c1.308.819 2.117 2.295 2.222 3.874.106 1.581-.227 3.289-1.127 4.994-.899 1.705-2.188 3.155-3.21 4.138a11.398 11.398 0 01-1.792 1.489l-.013.01-.006.004-.004.002a.75.75 0 01-.715 0z" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-600 hover:text-red-500 transition-colors">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                          </svg>
                        )}
                      </button>

                      <span className={`absolute top-2.5 left-2.5 px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider shadow-sm ${
                        item.listing_type === 'Swap' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.listing_type === 'Swap' ? 'SWAP' : `₹${item.price}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-sm text-gray-800 line-clamp-1">{item.title}</h3>
                      <span className="text-[11px] text-emerald-600 font-semibold uppercase tracking-wider whitespace-nowrap ml-2">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-medium uppercase tracking-tight">
                      📍 {item.building_block}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mb-10">
            <div className="mb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                📁 Browse by Category
              </h2>
              <p className="text-xs text-gray-400">Click a chip below to quickly filter the main feed marketplace</p>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                    selectedCategory === cat
                      ? 'bg-[#5B8C72] text-white border-[#5B8C72] shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div>
        <div className="flex justify-between items-baseline mb-4 border-b border-gray-100 pb-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">
            {activeTab === 'Marketplace' ? 'ALL CAMPUS LISTINGS' : 'MY OWN STASH'}
          </h2>
          <span className="text-xs text-gray-400 font-semibold bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
            {displayedItems.length} available matches
          </span>
        </div>

        {loading ? (
          <p className="text-center text-xs text-gray-400 py-12">Loading inventory...</p>
        ) : displayedItems.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-12">No items listed match this configuration.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedItems.map((item) => {
              const images = item.image_urls && item.image_urls.length > 0
                ? item.image_urls
                : item.image_url ? [item.image_url] : []

              return (
                <div
                  key={item.id}
                  onClick={() => activeTab === 'Marketplace' && setSelectedItem(item)}
                  className={`bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-all relative group ${
                    activeTab === 'Marketplace' ? 'hover:shadow-md cursor-pointer' : ''
                  }`}
                >
                  <div>
                    <div className="w-full h-40 rounded-xl overflow-hidden bg-gray-50 mb-3 relative border border-gray-50">
                      {images.length > 0 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={images[0]} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <CameraPlaceholder />
                      )}

                      {activeTab === 'Marketplace' && (
                        <button
                          onClick={(e) => toggleWishlist(e, item.id)}
                          className="absolute top-2.5 right-2.5 z-10 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-all scale-100 active:scale-95"
                        >
                          {wishlistedIds.has(item.id) ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-500">
                              <path d="M11.645 20.91l-.007-.003-.003-.001a11.4 11.4 0 01-.507-.375c-.325-.252-.776-.624-1.285-1.114-1.022-.983-2.311-2.433-3.21-4.138-.9-1.705-1.233-3.413-1.127-4.994.105-1.579.914-3.055 2.222-3.874a4.124 4.124 0 015.42.545l.624.624.624-.624a4.124 4.124 0 015.42-.545c1.308.819 2.117 2.295 2.222 3.874.106 1.581-.227 3.289-1.127 4.994-.899 1.705-2.188 3.155-3.21 4.138a11.398 11.398 0 01-1.792 1.489l-.013.01-.006.004-.004.002a.75.75 0 01-.715 0z" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-600 hover:text-red-500 transition-colors">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                            </svg>
                          )}
                        </button>
                      )}

                      <span className={`absolute top-2.5 left-2.5 px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider shadow-sm ${
                        item.listing_type === 'Swap' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.listing_type === 'Swap' ? 'SWAP' : `₹${item.price}`}
                      </span>
                    </div>

                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-sm text-gray-800 line-clamp-1">{item.title}</h3>
                      <span className="text-[11px] text-emerald-600 font-semibold uppercase tracking-wider whitespace-nowrap ml-2">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">{item.description}</p>
                  </div>

                  <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400 font-medium uppercase tracking-tight">
                      📍 {item.building_block}
                    </span>

                    {activeTab === 'MyListings' && (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => router.push(`/dashboard/items/${item.id}/edit`)}
                          className="px-2.5 py-1 text-[11px] font-bold text-[#5B8C72] bg-[#5B8C72]/10 rounded-lg hover:bg-[#5B8C72]/20"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="px-2.5 py-1 text-[11px] font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selectedItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-base transition-colors z-10"
            >
              ✕
            </button>

            {(() => {
              const urls = selectedItem.image_urls && selectedItem.image_urls.length > 0
                ? selectedItem.image_urls
                : selectedItem.image_url ? [selectedItem.image_url] : []

              if (urls.length === 0) {
                return (
                  <div className="w-full h-48 mb-4 overflow-hidden rounded-2xl border border-gray-100">
                    <CameraPlaceholder />
                  </div>
                )
              }

              return (
                <div className="relative w-full h-48 mb-4 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={urls[currentImageIndex]}
                    alt={`${selectedItem.title} preview`}
                    className="w-full h-full object-cover transition-all"
                  />

                  {urls.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setCurrentImageIndex((p) => (p === 0 ? urls.length - 1 : p - 1))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs transition-colors shadow-sm select-none"
                      >
                        ❮
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentImageIndex((p) => (p === urls.length - 1 ? 0 : p + 1))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs transition-colors shadow-sm select-none"
                      >
                        ❯
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 bg-black/20 px-2 py-1 rounded-full backdrop-blur-sm">
                        {urls.map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setCurrentImageIndex(idx)}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${
                              currentImageIndex === idx ? 'bg-white w-2.5' : 'bg-white/40'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            })()}

            <h2 className="text-lg font-bold text-gray-900 mb-1">{selectedItem.title}</h2>
            <div className="flex gap-1.5 mb-4 flex-wrap">
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded">
                📍 {selectedItem.building_block}
              </span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded">
                📦 {selectedItem.category}
              </span>
              {selectedItem.listing_type === 'Swap' && selectedItem.wanted_in_exchange && (
                <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-bold rounded">
                  🔁 Wants: {selectedItem.wanted_in_exchange}
                </span>
              )}
            </div>

            <p className="text-xs text-gray-600 mb-6 leading-relaxed">{selectedItem.description}</p>

            <div className="flex flex-col gap-2">
              {selectedItem.whatsapp_number && (
                <a
                  href={`https://wa.me/${selectedItem.whatsapp_number.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 text-center text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl uppercase tracking-wider transition-colors"
                >
                  💬 Chat on WhatsApp
                </a>
              )}
              <button
                onClick={() => handleProtectedAction(() => initiateTransaction(selectedItem))}
                className="w-full py-2.5 text-xs font-bold bg-[#5B8C72] hover:bg-[#4a735d] text-white rounded-xl uppercase tracking-wider transition-colors"
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