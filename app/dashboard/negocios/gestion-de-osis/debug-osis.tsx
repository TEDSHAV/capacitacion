'use client'

import { useEffect, useState } from 'react'
import { debugOSITable } from '@/app/actions/osi-debug'
import { getSimpleOSIs } from '@/app/actions/osi-simple'

export default function DebugOSI() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [simpleInfo, setSimpleInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const debug = async () => {
      try {
        // Run both debug functions
        const [complexResult, simpleResult] = await Promise.all([
          debugOSITable(),
          getSimpleOSIs()
        ])
        
        setDebugInfo(complexResult)
        setSimpleInfo(simpleResult)
      } catch (error) {
        setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' })
        setSimpleInfo({ error: error instanceof Error ? error.message : 'Unknown error' })
      } finally {
        setLoading(false)
      }
    }

    debug()
  }, [])

  if (loading) return <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">Loading debug info...</div>

  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-bold mb-2 text-blue-800">🔍 OSI Debug Information</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-blue-700">Simple Query Result:</h4>
            <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
              {JSON.stringify(simpleInfo, null, 2)}
            </pre>
          </div>
          
          <div>
            <h4 className="font-semibold text-blue-700">Complex Query Result:</h4>
            <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
