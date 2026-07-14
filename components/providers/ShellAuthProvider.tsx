'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function ShellAuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const supabase = createClient()

    function handleShellAuth(event: MessageEvent) {
      if (event.origin !== process.env.NEXT_PUBLIC_SHELL_URL) return
      if (event.data?.type !== 'SHELL_AUTH') return
      supabase.auth.setSession({
        access_token: event.data.access_token,
        refresh_token: event.data.refresh_token,
      })
    }

    window.addEventListener('message', handleShellAuth)
    return () => window.removeEventListener('message', handleShellAuth)
  }, [])

  return <>{children}</>
}
