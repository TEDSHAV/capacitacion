'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, memo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User } from '@/types/dashboard'

const Navbar = () => {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient() // Create client once

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = useCallback(async () => {
    const { handleLogout: logout } = await import('@/app/actions/auth');
    await logout();
  }, [])

  const handleBackClick = useCallback(() => {
    router.back()
  }, [router])

  const handleLoginClick = useCallback(() => {
    router.push('/login')
  }, [])

  const handleSignupClick = useCallback(() => {
    router.push('/signup')
  }, [])

  return (
    <nav className="bg-white shadow-md z-50">
      <div className="max-w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Left side - Navigation buttons */}
          <div className="flex items-center space-x-4">
            {/* Back button - only shown when user is authenticated */}
            {user && (
              <button
                onClick={handleBackClick}
                className="p-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
                title="Volver"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Center - Logo */}
          <div className="flex-1 flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="Logo de la Empresa" 
              className="h-10 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity duration-200"
              onClick={() => router.push('/dashboard')}
            />
          </div>
          
          {/* Right side - User menu */}
          <div className="flex items-center space-x-6">
            {user ? (
              <>
                <span className="text-sm text-gray-700">
                  Bienvenido, {user?.user_metadata?.name || user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors duration-200 shadow-md"
                  style={{ backgroundColor: '#dc2626', color: 'white' }}
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleLoginClick}
                  className="text-sm text-blue-600 hover:text-blue-700 px-3 py-2 rounded-md hover:bg-blue-50 transition-colors duration-200"
                >
                  Iniciar sesión
                </button>
                <button
                  onClick={handleSignupClick}
                  className="text-sm bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 rounded-md transition-colors duration-200 shadow-md"
                  style={{ backgroundColor: 'var(--primary-blue)' }}
                >
                  Registrarse
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default memo(Navbar)
