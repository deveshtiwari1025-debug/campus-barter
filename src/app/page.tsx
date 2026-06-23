'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase'

interface Item {
  id: string
  title: string
  description: string
  category: string
  building_block?: string
  hostel_block?: string
  listing_type?: string
  price?: number
  wanted_in_exchange?: string
  image_urls?: string[]
  image_url?: string
  whatsapp_number?: string
  owner_id: string
  status?: string
  created_at?: string
  expires_at?: string
}

// Reusable elegant inline SVG camera placeholder component
function CameraPlaceholder() {
  return (
    <div className="w-full h-full bg-[#F6F8F7] flex flex-col items-center justify-center space-y-1.5 p-4 select-none">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24" 
        strokeWidth={1.5} 
        stroke="currentColor" 
        className="w-7 h-7 text-gray-400/80"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          pathLength={1}
          d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" 
        />
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" 
        />
      </svg>
      <span className="text-[11px] font-medium text-gray-400">No photo uploaded</span>
    </div>
  )
}

export default function RootPage() {
  const router = useRouter()
  const supabase = createClient()

  // State Management
  const [items, setItems] = useState<Item[]>([])
  const [filteredItems, setFilteredItems] = useState<Item[]>([])
  const [user, setUser] = useState<any>(null)
  const [userBlock, setUserBlock] = useState<string>('')
  const [loading, setLoading] = useState(true)
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'swap' | 'buy'>('all')
  const [activeCategory, setActiveCategory] = useState<string>('All')
  
  // Modal View State
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    async function checkAuthAndLoadData() {
      try {
        setLoading(true)
        
        // 1. Fetch current session status securely
        const { data: { user: authUser } } = await supabase.auth.getUser()
        setUser(authUser)

        if (authUser) {
          // Detect user's current campus block from user profile metadata
          let block = authUser.user_metadata?.hostel_block || authUser.user_metadata?.building_block || ''
          
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('hostel_block, building_block')
              .eq('id', authUser.id)
              .single()
            if (profileData) {
              block = profileData.hostel_block || profileData.building_block || block
            }
          } catch (e) {
            console.log('Profiles check skipped or unconfigured, proceeding with session meta info.')
          }
          
          if (block) {
            setUserBlock(block)
          }
        }

        // 2. Load available items publicly from the database (filtering out expired ones)
        const { data: itemsData, error } = await supabase
          .from('items')
          .select('*')
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching public items:', error.message)
        } else if (itemsData) {
          // Standardize listings that are active/available
          const availableListings = (itemsData as Item[]).filter(
            (item) => !item.status || item.status === 'available'
          )
          setItems(availableListings)
          setFilteredItems(availableListings)
        }
      } catch (err) {
        console.error('Initialization error:', err)
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndLoadData()
  }, [supabase])

  // Process search input, filter pills, and category selections together
  useEffect(() => {
    let output = [...items]

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase()
      output = output.filter(
        (item) =>
          item.title?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      )
    }

    if (activeFilter === 'swap') {
      output = output.filter(
        (item) =>
          item.listing_type?.toLowerCase().includes('swap') ||
          item.listing_type?.toLowerCase().includes('trade') ||
          !!item.wanted_in_exchange
      )
    } else if (activeFilter === 'buy') {
      output = output.filter(
        (item) =>
          item.listing_type?.toLowerCase().includes('sell') ||
          item.listing_type?.toLowerCase().includes('cash') ||
          (item.price && item.price > 0)
      )
    }

    if (activeCategory !== 'All') {
      output = output.filter(
        (item) => item.category?.toLowerCase() === activeCategory.toLowerCase()
      )
    }

    setFilteredItems(output)
  }, [searchQuery, activeFilter, activeCategory, items])

  const handleActionProtection = (actionType: 'view' | 'lock', item?: Item) => {
    if (!user) {
      // Force unauthenticated user to login route with redirect pointer
      router.push('/login?redirectTo=/')
      return
    }

    if (actionType === 'view' && item) {
      setSelectedItem(item)
      setCurrentImageIndex(0)
    } else if (actionType === 'lock' && item) {
      // Handle locking logic or route to offer generation directly
      router.push(`/dashboard?openOffer=${item.id}`)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  // Helper to extract clean display images safely
  const getItemImages = (item: Item): string[] => {
    if (item.image_urls && item.image_urls.length > 0) return item.image_urls
    if (item.image_url) return [item.image_url]
    return []
  }

  // Derive localized row slices cleanly
  const newlyListed = items.slice(0, 6)
  const inYourBlock = userBlock
    ? items.filter(
        (item) =>
          item.building_block?.toLowerCase() === userBlock.toLowerCase() ||
          item.hostel_block?.toLowerCase() === userBlock.toLowerCase()
      ).slice(0, 6)
    : []

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8F7] flex items-center justify-center">
        <div className="text-sm font-medium text-[#5B8C72] animate-pulse">
          Loading CampusBarter Storefront...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-[#2A2F2D] antialiased">
      {/* Dynamic Navigation Header Context */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => router.push('/')}>
            <span className="text-xl">🤝</span>
            <span className="font-bold text-lg tracking-tight text-[#2A2F2D]">CampusBarter</span>
          </div>

          <nav className="flex items-center space-x-6">
            {user ? (
              <>
                <button onClick={() => router.push('/')} className="text-sm font-semibold text-[#5B8C72]">
                  Marketplace
                </button>
                <button onClick={() => router.push('/dashboard/my-listings')} className="text-sm font-medium text-gray-600 hover:text-[#5B8C72] transition-colors">
                  My Listings
                </button>
                <button onClick={() => router.push('/dashboard/offers')} className="text-sm font-medium text-gray-600 hover:text-[#5B8C72] transition-colors">
                  Offers Desk
                </button>
                <button
                  onClick={() => router.push('/dashboard/new-listing')}
                  className="px-4 py-1.5 bg-[#5B8C72] text-white text-xs font-bold rounded-md hover:bg-[#5B8C72]/90 shadow-sm transition-all"
                >
                  + Create Post
                </button>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-md hover:bg-gray-50 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => router.push('/login?redirectTo=/')}
                className="px-5 py-2 bg-[#5B8C72] text-white text-sm font-bold rounded-md hover:bg-[#5B8C72]/90 shadow-sm transition-all"
              >
                Sign In / Register
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Browse Dashboard Container */}
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Unified Search Control & Strategy Pill Row */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search textbooks, electronics, lab coats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-4 py-2.5 text-sm bg-[#F6F8F7] border border-transparent rounded-lg focus:outline-none focus:border-[#5B8C72] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeFilter === 'all'
                  ? 'bg-[#5B8C72] text-white shadow-sm'
                  : 'bg-[#F6F8F7] text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Items
            </button>
            <button
              onClick={() => setActiveFilter('swap')}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeFilter === 'swap'
                  ? 'bg-[#5B8C72] text-white shadow-sm'
                  : 'bg-[#F6F8F7] text-gray-600 hover:bg-gray-200'
              }`}
            >
              Swaps
            </button>
            <button
              onClick={() => setActiveFilter('buy')}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeFilter === 'buy'
                  ? 'bg-[#5B8C72] text-white shadow-sm'
                  : 'bg-[#F6F8F7] text-gray-600 hover:bg-gray-200'
              }`}
            >
              Buys
            </button>
          </div>
        </div>

        {/* Curated Section Showcase Rows */}
        <div className="space-y-8">
          {/* Section 1: Newly Listed Showcase */}
          {newlyListed.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-[#2A2F2D] flex items-center gap-1.5">
                  <span>✨</span> Newly Listed
                </h2>
                <span className="text-xs font-medium text-gray-400">Fresh from campus creators</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {newlyListed.map((item) => {
                  const images = getItemImages(item)
                  const hasSwap = item.listing_type?.toLowerCase().includes('swap') || item.listing_type?.toLowerCase().includes('trade') || !!item.wanted_in_exchange

                  return (
                    <div
                      key={`newly-${item.id}`}
                      onClick={() => handleActionProtection('view', item)}
                      className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between space-y-2"
                    >
                      <div className="space-y-2">
                        <div className="relative h-40 bg-[#F6F8F7] rounded-lg overflow-hidden flex items-center justify-center">
                          {images.length > 0 ? (
                            <img src={images[0]} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <CameraPlaceholder />
                          )}
                          <div className="absolute top-1 left-1">
                            <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow-sm uppercase ${
                              hasSwap ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {hasSwap ? 'Swap' : `₹${item.price || 0}`}
                            </span>
                          </div>
                        </div>
                        <h4 className="text-xs font-bold text-[#2A2F2D] line-clamp-1">{item.title}</h4>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-50">
                        <span className="truncate max-w-[55px]">📍 {item.building_block || item.hostel_block || 'VIT'}</span>
                        <span className="text-[#5B8C72] font-semibold truncate max-w-[55px]">{item.category}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Section 2: In Your Block Smart Match */}
          {user && userBlock && inYourBlock.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-[#2A2F2D] flex items-center gap-1.5">
                  <span>🏠</span> In Your Block ({userBlock})
                </h2>
                <span className="text-xs font-medium text-gray-400">Skip the cross-campus walk</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {inYourBlock.map((item) => {
                  const images = getItemImages(item)
                  const hasSwap = item.listing_type?.toLowerCase().includes('swap') || item.listing_type?.toLowerCase().includes('trade') || !!item.wanted_in_exchange

                  return (
                    <div
                      key={`block-${item.id}`}
                      onClick={() => handleActionProtection('view', item)}
                      className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between space-y-2"
                    >
                      <div className="space-y-2">
                        <div className="relative h-40 bg-[#F6F8F7] rounded-lg overflow-hidden flex items-center justify-center">
                          {images.length > 0 ? (
                            <img src={images[0]} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <CameraPlaceholder />
                          )}
                          <div className="absolute top-1 left-1">
                            <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow-sm uppercase ${
                              hasSwap ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {hasSwap ? 'Swap' : `₹${item.price || 0}`}
                            </span>
                          </div>
                        </div>
                        <h4 className="text-xs font-bold text-[#2A2F2D] line-clamp-1">{item.title}</h4>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-50">
                        <span className="truncate max-w-[55px]">📍 {item.building_block || item.hostel_block}</span>
                        <span className="text-[#5B8C72] font-semibold truncate max-w-[55px]">{item.category}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Section 3: Horizontal Category Filter chips */}
          <div className="space-y-3 border-t border-gray-100 pt-6">
            <div className="space-y-0.5">
              <h2 className="text-base font-extrabold text-[#2A2F2D]">🗂️ Browse by Category</h2>
              <p className="text-xs text-gray-400">Click a chip below to quickly filter the main feed marketplace</p>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {['All', 'Books', 'Electronics', 'Lab Gear', 'Hostel Essentials', 'Other'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                    activeCategory === cat
                      ? 'bg-[#5B8C72] text-white border-[#5B8C72] shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Global Catalog Subheading Context */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-black text-[#2A2F2D] tracking-tight uppercase">
            {activeCategory === 'All' ? 'All Campus Listings' : `${activeCategory} Listings`}
          </h2>
          <span className="text-xs text-gray-400 font-bold bg-white px-2.5 py-1 rounded-md border border-gray-100">
            {filteredItems.length} available match{filteredItems.length === 1 ? '' : 'es'}
          </span>
        </div>

        {/* Public Grid Feed Component */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400 text-sm">
            No campus listings match your current browse query.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredItems.map((item) => {
              const images = getItemImages(item)
              const hasSwap = item.listing_type?.toLowerCase().includes('swap') || item.listing_type?.toLowerCase().includes('trade') || !!item.wanted_in_exchange

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-40 bg-[#F6F8F7] flex items-center justify-center overflow-hidden border-b border-gray-50">
                      {images.length > 0 ? (
                        <img
                          src={images[0]}
                          alt={item.title}
                          className="w-full h-full object-cover object-center"
                        />
                      ) : (
                        <CameraPlaceholder />
                      )}
                      
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        <span className={`text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded shadow-sm ${
                          hasSwap ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {hasSwap ? 'Swap' : `₹${item.price || 0}`}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(item.building_block || item.hostel_block) && (
                          <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded">
                            📍 {item.building_block || item.hostel_block}
                          </span>
                        )}
                        <span className="bg-emerald-50 text-[#5B8C72] text-[10px] font-bold px-2 py-0.5 rounded">
                          📦 {item.category}
                        </span>
                      </div>
                      
                      <h3 className="font-bold text-sm text-[#2A2F2D] line-clamp-1">{item.title}</h3>
                      <p className="text-xs text-gray-500 line-clamp-2 min-h-[32px]">{item.description}</p>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <button
                      onClick={() => handleActionProtection('view', item)}
                      className="w-full py-2 bg-gray-50 text-gray-700 hover:bg-[#5B8C72] hover:text-white border border-gray-200 hover:border-[#5B8C72] text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* High-Fidelity Product Inspection Drawer / Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 relative">
            
            {/* Close Modal Interactor */}
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-3 right-3 z-50 w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors text-sm font-bold"
            >
              ×
            </button>

            {/* Carousel Slider Panel Container */}
            <div className="relative h-48 bg-gray-100 flex items-center justify-center">
              {getItemImages(selectedItem).length > 0 ? (
                <>
                  <img
                    src={getItemImages(selectedItem)[currentImageIndex]}
                    alt={selectedItem.title}
                    className="w-full h-full object-cover"
                  />
                  {getItemImages(selectedItem).length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? getItemImages(selectedItem).length - 1 : prev - 1))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-1.5 rounded-full shadow-sm text-xs font-bold"
                      >
                        ←
                      </button>
                      <button
                        onClick={() => setCurrentImageIndex((prev) => (prev === getItemImages(selectedItem).length - 1 ? 0 : prev + 1))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-1.5 rounded-full shadow-sm text-xs font-bold"
                      >
                        →
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-y-1/2 flex space-x-1">
                        {getItemImages(selectedItem).map((_, idx) => (
                          <div
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full ${idx === currentImageIndex ? 'bg-[#5B8C72]' : 'bg-gray-300'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <CameraPlaceholder />
              )}
            </div>

            {/* Description Metas and Handshake Invoker Control Frame */}
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="bg-[#F6F8F7] text-gray-700 text-[10px] font-bold px-2 py-1 rounded">
                    📍 {selectedItem.building_block || selectedItem.hostel_block || 'All Blocks'}
                  </span>
                  <span className="bg-emerald-50 text-[#5B8C72] text-[10px] font-bold px-2 py-1 rounded">
                    📦 {selectedItem.category}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-[#2A2F2D] pt-1">{selectedItem.title}</h2>
              </div>

              <div className="space-y-2 border-t border-gray-100 pt-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{"Condition & Description"}</h4>
                <p className="text-sm text-gray-600 leading-relaxed bg-[#F6F8F7] p-3 rounded-lg border border-gray-50 whitespace-pre-line">
                  {selectedItem.description}
                </p>
              </div>

              {selectedItem.wanted_in_exchange && (
                <div className="bg-purple-50/70 border border-purple-100 p-3 rounded-lg space-y-0.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-purple-700">Looking For In Exchange:</span>
                  <p className="text-xs text-purple-900 font-medium">{selectedItem.wanted_in_exchange}</p>
                </div>
              )}

              {selectedItem.price && selectedItem.price > 0 ? (
                <div className="bg-amber-50/70 border border-amber-100 p-3 rounded-lg space-y-0.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-700">Direct Purchase Price:</span>
                  <p className="text-sm text-amber-900 font-extrabold">₹{selectedItem.price}</p>
                </div>
              ) : null}

              {/* Secured Handshake Call to Action Elements */}
              <div className="grid grid-cols-1 gap-2 pt-2">
                {selectedItem.whatsapp_number && (
                  <a
                    href={`https://wa.me/${selectedItem.whatsapp_number.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 bg-[#25D366] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#25D366]/90 transition-colors flex items-center justify-center gap-1.5"
                  >
                    💬 Chat on WhatsApp
                  </a>
                )}
                <button
                  onClick={() => handleActionProtection('lock', selectedItem)}
                  className="w-full py-2.5 bg-[#5B8C72] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#5B8C72]/90 transition-colors flex items-center justify-center gap-1.5"
                >
                  🔄 Lock Swap Deal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}