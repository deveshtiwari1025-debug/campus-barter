'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'

export default function NotificationWrapper({ children }: { children: React.ReactNode }) {
  const [notification, setNotification] = useState<{ title: string; message: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    let channel: any

    async function setupRealtimeSubscription() {
      // Get the active session user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Listen for inserts on the offers table in real time
      channel = supabase
        .channel('dashboard-notifications')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'offers' },
          async (payload: any) => {
            const newOffer = payload.new

            // Verify if this new offer belongs to an item owned by the current user
            const { data: itemData } = await supabase
              .from('items')
              .select('title, owner_id')
              .eq('id', newOffer.item_id)
              .single()

            if (itemData && itemData.owner_id === user.id) {
              setNotification({
                title: 'New Trade Offer!',
                message: `Someone just proposed a trade for your item: "${itemData.title}"`
              })

              // Auto-dismiss the toast alert after 5 seconds
              setTimeout(() => setNotification(null), 5000)
            }
          }
        )
        .subscribe()
    }

    setupRealtimeSubscription()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [supabase])

  return (
    <>
      {/* Toast Alert UI */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full bg-white border-l-4 border-[#5B8C72] shadow-lg rounded-r-md p-4 animate-bounce">
          <div className="flex items-start">
            <div className="flex-shrink-0 text-xl">🔔</div>
            <div className="ml-3">
              <p className="text-sm font-bold text-[#2A2F2D]">{notification.title}</p>
              <p className="text-xs text-[#6B85A0] mt-0.5">{notification.message}</p>
            </div>
            <button 
              onClick={() => setNotification(null)} 
              className="ml-auto text-gray-400 hover:text-gray-600 text-sm font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}
      {children}
    </>
  )
}