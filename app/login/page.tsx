import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import LoginForm from '@/components/LoginForm'

export default async function LoginPage() {
  // Check if user is already logged in
  const cookieStore = await cookies()
  const userCookie = cookieStore.get('user')
  
  if (userCookie) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoginForm />
    </div>
  )
}
