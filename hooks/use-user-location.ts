"use client"

import { useCallback, useState } from 'react'
import type { LatLng } from '@/lib/location-utils'

export function useUserLocation() {
  const [location, setLocation] = useState<LatLng | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  const detectLocation = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationError('Geolocation is not supported in this browser.')
      return null
    }

    setIsDetecting(true)
    setLocationError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        })
      })

      const nextLocation: LatLng = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }

      setLocation(nextLocation)
      return nextLocation
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to detect your location.'
      setLocationError(message)
      return null
    } finally {
      setIsDetecting(false)
    }
  }, [])

  return {
    location,
    setLocation,
    detectLocation,
    isDetecting,
    locationError,
    clearLocationError: () => setLocationError(null),
  }
}
