// Input validation utilities for security

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .slice(0, 1000) // Limit length
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/
  return phoneRegex.test(phone) && phone.length >= 10
}

export function validateOSINumber(osiNumber: string): boolean {
  // OSI numbers should be alphanumeric and reasonable length
  const osiRegex = /^[a-zA-Z0-9\-]{1,20}$/
  return osiRegex.test(osiNumber)
}

export function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== 'string') return ''
  
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return ['http:', 'https:'].includes(urlObj.protocol)
  } catch {
    return false
  }
}

export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.\-_]/g, '')
    .replace(/\.\./g, '')
    .slice(0, 255)
}

export function validatePaginationParams(page: any, limit: any): {
  page: number
  limit: number
  isValid: boolean
} {
  const pageNum = parseInt(page, 10)
  const limitNum = parseInt(limit, 10)
  
  const validPage = Number.isInteger(pageNum) && pageNum > 0 && pageNum <= 1000
  const validLimit = Number.isInteger(limitNum) && limitNum > 0 && limitNum <= 100
  
  return {
    page: validPage ? pageNum : 1,
    limit: validLimit ? limitNum : 20,
    isValid: validPage && validLimit
  }
}
