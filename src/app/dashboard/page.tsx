'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase'

export default function DashboardPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState('All') // 'All', 'Swap', 'Buy'
  const [userSession, setUserSession] = useState<any>(null)
  
  // Handshake Modal Tracking
  const [activeHandshake, setActiveHandshake] = useState<any>(null)
  const [inputBuyerOtp, setInputBuyerOtp] = useState('')
  const [inputSellerOtp, setInputSellerOtp] = useState('')
  const [verificationError, setVerificationError] = useState('')

  const router = useRouter()
  const supabase = createClient()

  // 1. Silent auth check (Doesn't boot out public users)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserSession(session)
    })
  }, [supabase])

  // 2. Fetch fresh items directly from the table
  const fetchMarketplaceItems = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('status', 'available')
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

  // Intercept actions for non-logged-in users
  const handleProtectedAction = (actionCallback: () => void) => {
    if (!userSession) {
      router.push('/signup')
    } else {
      actionCallback()
    }
  }

  // 3. Initiate Transaction & Generate Dual OTP codes
  const initiateTransaction = async (item: any) => {
    try {
      const buyerId = userSession.user.id
      if (buyerId === item.owner_id) {
        alert("You can't buy or swap your own item!")
        return
      }

      // Generate random 6-digit codes
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
      alert(`Deal Initiated! Meet up on campus. Your OTP for the seller is: ${generatedBuyerOtp}. Get their OTP to complete the verification!`)
    } catch (err: any) {
      alert(err.message)
    }
  }

  // 4. Verify Double Handshake OTP
  const verifyHandshake = async () => {
    if (!activeHandshake) return
    setVerificationError('')

    try {
      // Check if codes match the DB entries
      const matchesBuyer = inputBuyerOtp === activeHandshake.buyer_otp
      const matchesSeller = inputSellerOtp === activeHandshake.seller_otp

      if (!matchesBuyer || !matchesSeller) {
        throw new Error('Invalid OTP codes entered. Check with the other party.')
      }

      // Update offer record to status complete
      const { error: offerError } = await supabase
        .from('offers')
        .update({ buyer_verified: true, seller_verified: true, status: 'completed' })
        .eq('id', activeHandshake.id)

      if (offerError) throw offerError

      // Mark the actual marketplace item as sold
      await supabase
        .from('items')
        .update({ status: 'sold' })
        .eq('id', activeHandshake.item_id)

      alert('Success! Transaction securely closed and verified.')
      setActiveHandshake(null)
      setInputBuyerOtp('')
      setInputSellerOtp('')
      fetchMarketplaceItems()
    } catch (err: any) {
      setVerificationError(err.message)
    }
  }

  // Search and filter sorting logic
  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filter === 'All' || item.listing_type === filter
    return matchesSearch && matchesFilter
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header Utilities */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <input
          type="text"
          placeholder="Search textbooks, electronics, lab coats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:max-w-md px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#5B8C72] text-gray-900 bg-white"
        />
        
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setFilter('All')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'All' ? 'bg-[#5B8C72] text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            All Items
          </button>
          <button
            onClick={() => setFilter('Swap')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'Swap' ? 'bg-[#5B8C72] text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Swaps
          </button>
          <button
            onClick={() => setFilter('Buy')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'Buy' ? 'bg-[#5B8C72] text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Buys
          </button>
          <button
            onClick={() => handleProtectedAction(() => router.push('/dashboard/new-listing'))}
            className="ml-4 px-4 py-2 text-xs font-bold bg-[#5B8C72] text-white rounded-lg hover:bg-[#5B8C72]/90 tracking-wider uppercase"
          >
            + Create Post
          </button>
        </div>
      </div>

      {/* Handshake Verification Portal Component */}
      {activeHandshake && (
        <div className="mb-8 p-6 bg-amber-50/60 border border-amber-200 rounded-2xl max-w-md mx-auto">
          <h3 className="text-sm font-bold text-amber-900 mb-1">🔐 Secure Handshake Verification</h3>
          <p className="text-xs text-amber-700 mb-4">Provide your code to the seller and enter theirs below to finalize the trade securely.</p>
          {verificationError && <p className="text-xs text-red-600 font-semibold mb-2">{verificationError}</p>}
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">Your Code (Give to Seller)</label>
              <input type="text" disabled value={activeHandshake.buyer_otp} className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg font-mono text-center font-bold text-amber-900 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">Confirm Your Code</label>
                <input type="text" maxLength={6} placeholder="Buyer OTP" value={inputBuyerOtp} onChange={(e) => setInputBuyerOtp(e.target.value)} className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-center font-mono text-sm text-gray-900" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">Enter Seller's Code</label>
                <input type="text" maxLength={6} placeholder="Seller OTP" value={inputSellerOtp} onChange={(e) => setInputSellerOtp(e.target.value)} className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-center font-mono text-sm text-gray-900" />
              </div>
            </div>
            <button onClick={verifyHandshake} className="w-full mt-2 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg uppercase tracking-wider">
              Verify & Complete Deal
            </button>
          </div>
        </div>
      )}

      {/* Main Grid Wall */}
      {loading ? (
        <p className="text-center text-sm text-gray-500 py-12">Scanning campus catalog...</p>
      ) : filteredItems.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-12">No campus listings match your current filters.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                {item.image_url && (
                  <img src={item.image_url} alt={item.title} className="w-full h-40 object-cover rounded-xl mb-4 border border-gray-50" />
                )}
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h2 className="font-bold text-gray-800 text-base line-clamp-1">{item.title}</h2>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${item.listing_type === 'Swap' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                    {item.listing_type === 'Swap' ? '🔄 Swap' : `₹${item.price}`}
                  </span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-3 mb-4 leading-relaxed">{item.description}</p>
              </div>

              <div className="pt-4 border-t border-gray-50 flex flex-col gap-2">
                <div className="flex justify-between text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                  <span>📍 {item.building_block}</span>
                  <span>📦 {item.category}</span>
                </div>
                <button
                  onClick={() => handleProtectedAction(() => initiateTransaction(item))}
                  className="w-full mt-2 py-2 text-xs font-bold text-center text-white bg-[#5B8C72] hover:bg-[#5B8C72]/90 rounded-lg transition-colors uppercase tracking-wider"
                >
                  {item.listing_type === 'Swap' ? '🤝 Request Swap' : '🛒 Purchase Item'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}