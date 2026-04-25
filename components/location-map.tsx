"use client"

import { useMemo } from 'react'
import { GoogleMap, MarkerF } from '@react-google-maps/api'
import { useGoogleMaps } from '@/hooks/use-google-maps'
import type { LatLng } from '@/lib/location-utils'

interface MapBranch {
  id: string
  name: string
  address: string
  latitude?: number | null
  longitude?: number | null
}

interface LocationMapProps {
  branches: MapBranch[]
  selectedLocation?: LatLng | null
  center?: LatLng | null
  zoom?: number
  height?: number
  className?: string
  allowLocationPick?: boolean
  onLocationSelect?: (location: LatLng) => void
  onBranchMarkerClick?: (branchId: string) => void
  fallbackQuery?: string
  forceIframeSrc?: string
}

const mapContainerStyle = {
  width: '100%',
}

export function LocationMap({
  branches,
  selectedLocation = null,
  center = null,
  zoom = 12,
  height = 300,
  className,
  allowLocationPick = false,
  onLocationSelect,
  onBranchMarkerClick,
  fallbackQuery,
  forceIframeSrc,
}: LocationMapProps) {
  const { hasApiKey, isLoaded, loadError } = useGoogleMaps()

  const branchMarkers = useMemo(
    () =>
      branches.filter(
        (branch) => Number.isFinite(branch.latitude) && Number.isFinite(branch.longitude),
      ),
    [branches],
  )

  const mapCenter = useMemo<LatLng>(() => {
    if (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
      return center
    }

    if (selectedLocation) {
      return selectedLocation
    }

    if (branchMarkers.length > 0) {
      return {
        lat: Number(branchMarkers[0].latitude),
        lng: Number(branchMarkers[0].longitude),
      }
    }

    return { lat: 24.8607, lng: 67.0011 }
  }, [branchMarkers, center, selectedLocation])

  const mapFallbackQuery = fallbackQuery ||
    (branchMarkers.length > 0
      ? `${branchMarkers[0].name}, ${branchMarkers[0].address}`
      : 'Fatty Patty Karachi')

  const iframeSrc = forceIframeSrc || `https://www.google.com/maps?q=${encodeURIComponent(mapFallbackQuery)}&output=embed`

  if (forceIframeSrc || !hasApiKey || loadError || !isLoaded) {
    return (
      <iframe
        src={iframeSrc}
        width="100%"
        height={height}
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Map preview"
        className={className}
      />
    )
  }

  return (
    <GoogleMap
      mapContainerStyle={{ ...mapContainerStyle, height }}
      center={mapCenter}
      zoom={zoom}
      onClick={(event) => {
        if (!allowLocationPick || !onLocationSelect) {
          return
        }
        const lat = event.latLng?.lat()
        const lng = event.latLng?.lng()
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return
        }
        onLocationSelect({ lat: Number(lat), lng: Number(lng) })
      }}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
      }}
      mapContainerClassName={className}
    >
      {branchMarkers.map((branch) => (
        <MarkerF
          key={branch.id}
          position={{ lat: Number(branch.latitude), lng: Number(branch.longitude) }}
          title={branch.name}
          onClick={() => onBranchMarkerClick?.(branch.id)}
        />
      ))}

      {selectedLocation && (
        <MarkerF
          position={selectedLocation}
          title="Selected delivery location"
        />
      )}
    </GoogleMap>
  )
}
