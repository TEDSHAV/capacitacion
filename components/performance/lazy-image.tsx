'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { LazyImageProps } from '@/types'
import Image, { ImageProps, StaticImageData } from 'next/image'

export default function LazyImage({
  src,
  alt,
  fallback = '/images/placeholder.png',
  threshold = 0.1,
  rootMargin = '50px',
  className,
  ...props
}: LazyImageProps & { src: string | StaticImageData; alt: string }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [threshold, rootMargin])

  const handleLoad = useCallback(() => {
    setIsLoaded(true)
  }, [])

  const handleError = useCallback(() => {
    setHasError(true)
    setIsLoaded(true)
  }, [])

  return (
    <div ref={imgRef} className={`relative ${className || ''}`}>
      {isInView && (
        <Image
          src={hasError ? fallback : src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          width={typeof props.width === 'string' ? parseInt(props.width) : props.width}
          height={typeof props.height === 'string' ? parseInt(props.height) : props.height}
        />
      )}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
    </div>
  )
}
