import { NextRequest } from 'next/server'

// Simple in-memory rate limiter for development
// In production, use Redis or a database
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100 // Max requests per window

export function rateLimit(request: NextRequest): {
  success: boolean
  remaining: number
  resetTime: number
} {
  // Get client IP from various headers
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || 'unknown'
  
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW
  
  // Clean up old entries
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
  
  // Get or create rate limit entry
  let entry = rateLimitStore.get(ip)
  
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    }
    rateLimitStore.set(ip, entry)
  } else {
    entry.count++
  }
  
  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - entry.count)
  const success = entry.count <= RATE_LIMIT_MAX_REQUESTS
  
  return {
    success,
    remaining,
    resetTime: entry.resetTime
  }
}

export function createRateLimitResponse() {
  return new Response('Too Many Requests', {
    status: 429,
    headers: {
      'Retry-After': '900', // 15 minutes
      'Content-Type': 'text/plain'
    }
  })
}
