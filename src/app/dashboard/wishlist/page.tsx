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

export default function WishlistPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userSession, setUserSession] = useState<any>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setCurrentImageIndex(0)
  }, [selectedItem])

  const fetchWishlistItems = useCallback(async (userId: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('wishlists')
        .select(`
          item_id,
          items:item_id (*)
        `)
        .eq('user_id', userId)

      if (error) throw error

      // Filter out any broken mappings or sold entries
      const filtered: Item[] = (data || [])
        .map((row: any) => row.items)
        .filter((item: any): item is Item => !!item && item.status === 'available')

      setItems(filtered)
    } catch (err) {
      console.error('Error fetching wishlist content:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.push('/login')
        return
      }
      setUserSession(data.session)
      fetchWishlistItems(data.session.user.id)
    }
    checkAuthAndFetch()
  }, [supabase, router, fetchWishlistItems])

  const removeWishlistItem = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation()
    if (!userSession) return

    try {
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', userSession.user.id)
        .eq('item_id', itemId)

      if (error) throw error
      setItems((prev) => prev.filter((item) => item.id !== itemId))
      if (selectedItem?.id === itemId) setSelectedItem(null)
    } catch (err) {
      console.error('Failed to clear wishlist bookmark:', err)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 text-gray-900">
      <div className="mb-6 border-b border-gray-100 pb-4">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          ❤️ My Campus Wishlist
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">Your saved bookmarked stash across campus</p>
      </div>

      {loading ? (
        <p className="text-center text-xs text-gray-400 py-12">Loading saved items...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
          <p className="text-xs text-gray-400 mb-3">Your wishlist is currently empty.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 text-xs font-bold bg-[#5B8C72] text-white rounded-xl uppercase tracking-wider"
          >
            Explore Marketplace
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const images = item.image_urls && item.image_urls.length > 0
              ? item.image_urls
              : item.image_url ? [item.image_url] : []

            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-md cursor-pointer relative group"
              >
                <div>
                  <div className="w-full h-40 rounded-xl overflow-hidden bg-gray-50 mb-3 relative border border-gray-50">
                    {images.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={images[0]} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <CameraPlaceholder />
                    )}

                    <button
                      onClick={(e) => removeWishlistItem(e, item.id)}
                      className="absolute top-2.5 right-2.5 z-10 p-1.5 bg-white rounded-full shadow-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-500">
                        <path d="M11.645 20.91l-.007-.003-.003-.001a11.4 11.4 0 01-.507-.375c-.325-.252-.776-.624-1.285-1.114-1.022-.983-2.311-2.433-3.21-4.138-.9-1.705-1.233-3.413-1.127-4.994.105-1.579.914-3.055 2.222-3.874a4.124 4.124 0 015.42.545l.624.624.624-.624a4.124 4.124 0 015.42-.545c1.308.819 2.117 2.295 2.222 3.874.106 1.581-.227 3.289-1.127 4.994-.899 1.705-2.188 3.155-3.21 4.138a11.398 11.398 0 01-1.792 1.489l-.013.01-.006.004-.004.002a.75.75 0 01-.715 0z" />
                      </svg>
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
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">{item.description}</p>
                </div>

                <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-medium uppercase tracking-tight">
                    📍 {item.building_block}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

