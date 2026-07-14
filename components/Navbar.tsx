'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, memo } from 'react'
import { createClient } from '@/utils/supabase/client'
import Image from 'next/image'

const Navbar = () => {
  const router = useRouter()
  const [user, setUser] = useState<{ user_metadata?: { name?: string }; email?: string } | null>(null)
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

  const handleLogoClick = useCallback(() => {
    router.push('/dashboard')
  }, [router])

  const handleLoginClick = useCallback(() => {
    router.push('/login')
  }, [router])

  const handleSignupClick = useCallback(() => {
    router.push('/signup')
  }, [router]) 

  return (
    <nav className="bg-white shadow-md fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Navigation buttons */}
          <div className="flex items-center space-x-4">
            {/* Back button - can be conditionally shown */}
            <button
              onClick={handleBackClick}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
              title="Volver"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
          
          {/* Center - Logo */}
          <div className="flex items-center justify-center absolute left-1/2 transform -translate-x-1/2">
            <Image 
              src="/logo.png" 
              alt="Logo de la Empresa" 
              width={120} 
              height={120}
              loading='lazy'
              className="cursor-pointer hover:opacity-80 transition-opacity duration-200 h-12 w-auto object-contain"
              onClick={handleLogoClick}
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
