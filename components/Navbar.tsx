'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Image from 'next/image'

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const supabase = createClient() // Create client once

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: any, session: any) => {
        setUser(session?.user || null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut() // Use existing client
    router.push('/login')
  } 

  return (
    <nav className="bg-white shadow-md fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Image 
              src="/logo.png" 
              alt="Logo de la Empresa" 
              width={150} 
              height={150}
              className="cursor-pointer hover:opacity-80 transition-opacity duration-200"
              onClick={() => router.push('/dashboard')}
            />
          </div>
          <div className="flex items-center space-x-6">
            {user ? (
              <>
                {/* <h1 className="text-xl font-semibold text-gray-900">Portal Empresarial</h1> */}
                <span className="text-sm text-gray-700">
                  Bienvenido, {user?.user_metadata?.name || user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => router.push('/login')}
                  className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
                >
                  Iniciar sesión
                </button>
                <button
                  onClick={() => router.push('/signup')}
                  className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
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
