'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase'

export default function DashboardPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState('All') // 'All', 'Swap', 'Buy'
  const [activeTab, setActiveTab] = useState('Marketplace') // 'Marketplace', 'MyListings'
  const [userSession, setUserSession] = useState<any>(null)
  
  // Modals & Handshakes
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [activeHandshake, setActiveHandshake] = useState<any>(null)
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
    } catch (err) {
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

  const initiateTransaction = async (item: any) => {
    try {
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
      setSelectedItem(null) // close details modal
      alert(`Deal Initiated! Use the verification panel on your dashboard to finalize. Your code for the seller is: ${generatedBuyerOtp}`)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const verifyHandshake = async () => {
    if (!activeHandshake) return
    setVerificationError('')

    try {
      if (inputBuyerOtp !== activeHandshake.buyer_otp || inputSellerOtp !== activeHandshake.seller_otp) {
        throw new Error('Invalid OTP codes entered. Check codes with the other party.')
      }

      await supabase
        .from('offers')
        .update({ buyer_verified: true, seller_verified: true, status: 'completed' })
        .eq('id', activeHandshake.id)

      await supabase
        .from('items')
        .update({ status: 'sold' })
        .eq('id', activeHandshake.item_id)

      alert('Handshake verified successfully! Item marked as Sold.')
      setActiveHandshake(null)
      setInputBuyerOtp('')
      setInputSellerOtp('')
      fetchMarketplaceItems()
    } catch (err: any) {
      setVerificationError(err.message)
    }
  }

  const deleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return
    const { error } = await supabase.from('items').delete().eq('id', id)
    if (error) alert(error.message)
    else fetchMarketplaceItems()
  }

  // Frontend Client-Side Filter Execution
  const displayedItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filter === 'All' || item.listing_type === filter
    const matchesTab = activeTab === 'Marketplace' 
      ? item.status === 'available' 
      : item.owner_id === userSession?.user?.id
    
    return matchesSearch && matchesFilter && matchesTab
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Local high-priority CSS overrides to guarantee text remains black */}
      <style jsx global>{`
        #forced-search-input {
          color: #000000 !important;
          background-color: #ffffff !important;
        }
        #forced-search-input::placeholder {
          color: #4b5563 !important;
          opacity: 1 !important;
        }
        #forced-search-input:-ms-input-placeholder {
          color: #4b5563 !important;
        }
        #forced-search-input::-ms-input-placeholder {
          color: #4b5563 !important;
        }
      `}</style>

      {/* Top Segmented Navigation Tabs */}
      <div className="flex justify-center border-b border-gray-100 mb-6 gap-8 text-sm font-semibold">
        <button 
          onClick={() => setActiveTab('Marketplace')} 
          className={`pb-3 ${activeTab === 'Marketplace' ? 'border-b-2 border-[#5B8C72] text-[#5B8C72]' : 'text-gray-400'}`}
        >
          Marketplace
        </button>
        <button 
          onClick={() => handleProtectedAction(() => setActiveTab('MyListings'))} 
          className={`pb-3 ${activeTab === 'MyListings' ? 'border-b-2 border-[#5B8C72] text-[#5B8C72]' : 'text-gray-400'}`}
        >
          My Listings
        </button>
      </div>

      {/* Control Utility Row */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <input
          id="forced-search-input"
          type="text"
          placeholder="Search textbook, electronics, lab coats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            color: '#000000',
            backgroundColor: '#ffffff',
          }}
          className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none text-black placeholder:!text-gray-500 font-medium"
        />
        
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {['All', 'Swap', 'Buy'].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === t ? 'bg-[#5B8C72] text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {t === 'All' ? 'All Items' : t === 'Swap' ? 'Swaps' : 'Buys'}
            </button>
          ))}
          <button
            onClick={() => handleProtectedAction(() => router.push('/dashboard/new-listing'))}
            className="ml-4 px-4 py-2 text-xs font-bold bg-[#5B8C72] text-white rounded-lg uppercase tracking-wider"
          >
            + Create Post
          </button>
        </div>
      </div>

      {/* Secure Handshake Widget */}
      {activeHandshake && (
        <div className="mb-8 p-6 bg-amber-50/60 border border-amber-200 rounded-2xl max-w-md mx-auto">
          <h3 className="text-sm font-bold text-amber-900 mb-1">🔐 Secure Handshake Verification</h3>
          <p className="text-xs text-amber-700 mb-4">Swap OTP validation codes to close your transaction.</p>
          {verificationError && <p className="text-xs text-red-600 font-semibold mb-2">{verificationError}</p>}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-amber-800 uppercase mb-1">Confirm Your Code</label>
                <input type="text" maxLength={6} placeholder="Buyer OTP" value={inputBuyerOtp} onChange={(e) => setInputBuyerOtp(e.target.value)} className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-center font-mono text-sm text-gray-900" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-amber-800 uppercase mb-1">Enter Seller's Code</label>
                <input type="text" maxLength={6} placeholder="Seller OTP" value={inputSellerOtp} onChange={(e) => setInputSellerOtp(e.target.value)} className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-center font-mono text-sm text-gray-900" />
              </div>
            </div>
            <button onClick={verifyHandshake} className="w-full mt-2 py-2 text-xs font-bold text-white bg-amber-700 rounded-lg uppercase tracking-wider">
              Verify & Complete Deal
            </button>
          </div>
        </div>
      )}

      {/* Main Listing Output Grid */}
      {loading ? (
        <p className="text-center text-sm text-gray-500 py-12">Loading items...</p>
      ) : displayedItems.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-12">No listings found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedItems.map((item) => (
            <div key={item.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                {item.image_url && <img src={item.image_url} alt={item.title} className="w-full h-40 object-cover rounded-xl mb-4" />}
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h2 className="font-bold text-gray-800 text-base line-clamp-1">{item.title}</h2>
                  <span className="text-xs font-bold text-emerald-600">{item.listing_type === 'Swap' ? '🔄 Swap' : `₹${item.price}`}</span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 mb-4">{item.description}</p>
              </div>

              <div className="pt-4 border-t border-gray-50 flex flex-col gap-2">
                {activeTab === 'MyListings' ? (
                  <div className="flex gap-2">
                    <span className={`px-3 py-1.5 text-xs font-bold rounded-lg text-center flex-1 ${item.status === 'sold' ? 'bg-gray-100 text-gray-400' : 'bg-emerald-50 text-emerald-700'}`}>
                      {item.status === 'sold' ? 'Sold Out' : 'Active'}
                    </span>
                    <button onClick={() => deleteItem(item.id)} className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                      Delete
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="w-full py-2 text-xs font-bold text-center text-white bg-[#5B8C72] rounded-lg uppercase tracking-wider"
                  >
                    View Details →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Item Detail View Popover Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
            
            {selectedItem.image_url && <img src={selectedItem.image_url} alt={selectedItem.title} className="w-full h-48 object-cover rounded-2xl mb-4" />}
            <h2 className="text-xl font-bold text-gray-900 mb-1">{selectedItem.title}</h2>
            <div className="flex gap-2 mb-4">
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded">📍 {selectedItem.building_block}</span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded">📦 {selectedItem.category}</span>
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