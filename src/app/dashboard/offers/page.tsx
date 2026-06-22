'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'

export default function OffersPage() {
  const [debugData, setDebugData] = useState<{
    userId: string;
    incomingCount: number;
    outgoingCount: number;
    incomingError: string;
    outgoingError: string;
    rawIncoming: any[];
  }>({
    userId: '',
    incomingCount: 0,
    outgoingCount: 0,
    incomingError: 'None',
    outgoingError: 'None',
    rawIncoming: []
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function runDiagnostics() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setDebugData(prev => ({ ...prev, incomingError: 'No active user session found.' }))
        return
      }

      // Test 1: Fetch RAW incoming offers without ANY table joins
      const { data: incoming, error: incErr } = await supabase
        .from('offers')
        .select('*')
        .eq('seller_id', user.id)

      // Test 2: Fetch RAW outgoing offers without ANY table joins
      const { data: outgoing, error: outErr } = await supabase
        .from('offers')
        .select('*')
        .eq('buyer_id', user.id)

      setDebugData({
        userId: user.id,
        incomingCount: incoming ? incoming.length : 0,
        outgoingCount: outgoing ? outgoing.length : 0,
        incomingError: incErr ? incErr.message : 'None',
        outgoingError: outErr ? outErr.message : 'None',
        rawIncoming: incoming || []
      })

    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runDiagnostics()
  }, [supabase])

  if (loading) return <div className="p-8 text-center">Running system diagnostics...</div>

  return (
    <div className="max-w-2xl mx-auto p-6 my-8 bg-slate-900 text-green-400 font-mono rounded-2xl shadow-xl border border-slate-800 text-sm space-y-4">
      <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-2">🛠️ System Diagnostic Dashboard</h2>
      
      <div>
        <span className="text-gray-400">Your Auth User ID:</span>
        <p className="text-white bg-slate-800 p-2 rounded mt-1 text-xs break-all">{debugData.userId || "Not Logged In"}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <span className="text-gray-400 block text-xs">RAW INCOMING OFFERS</span>
          <span className="text-2xl font-bold text-white">{debugData.incomingCount} rows</span>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <span className="text-gray-400 block text-xs">RAW OUTGOING OFFERS</span>
          <span className="text-2xl font-bold text-white">{debugData.outgoingCount} rows</span>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <span className="text-gray-400 block text-xs">Incoming Query Error Status:</span>
          <p className={`p-2 rounded text-xs ${debugData.incomingError === 'None' ? 'bg-emerald-950/50 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
            {debugData.incomingError}
          </p>
        </div>
        <div>
          <span className="text-gray-400 block text-xs">Outgoing Query Error Status:</span>
          <p className={`p-2 rounded text-xs ${debugData.outgoingError === 'None' ? 'bg-emerald-950/50 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
            {debugData.outgoingError}
          </p>
        </div>
      </div>

      <div>
        <span className="text-gray-400 block text-xs mb-1">Raw Database Payloads Received:</span>
        <pre className="bg-black/50 p-4 rounded-xl text-xs overflow-x-auto text-gray-300 max-h-48 scrollbar-thin">
          {JSON.stringify(debugData.rawIncoming, null, 2)}
        </pre>
      </div>

      <button 
        onClick={runDiagnostics}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-sans font-bold py-2.5 rounded-xl transition-all uppercase text-xs tracking-wider"
      >
        🔄 Force Re-Check Database
      </button>
    </div>
  )
}