"use client"

import { useMemo } from 'react'
import { useJsApiLoader } from '@react-google-maps/api'

const MAP_LIBRARIES: Array<'places' | 'drawing'> = ['places', 'drawing']

export function useGoogleMaps() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  const hasApiKey = Boolean(apiKey)

  const loader = useJsApiLoader({
    id: 'fatty-patty-google-maps',
    googleMapsApiKey: apiKey,
    libraries: MAP_LIBRARIES,
  })

  return useMemo(
    () => ({
      hasApiKey,
      isLoaded: hasApiKey && loader.isLoaded,
      loadError: hasApiKey ? loader.loadError : new Error('Google Maps API key is missing'),
    }),
    [hasApiKey, loader.isLoaded, loader.loadError],
  )
}
