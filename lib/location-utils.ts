export interface LatLng {
  lat: number
  lng: number
}

export interface DeliveryAreaShape {
  area_name?: string | null
  is_active?: boolean | null
  polygon_coordinates?: unknown
}

export interface BranchWithGeo {
  id: string
  name: string
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  delivery_radius?: number | null
  delivery_areas?: DeliveryAreaShape[] | null
}

export interface DeliveryCoverageResult {
  isAvailable: boolean
  reason: 'inside_polygon' | 'inside_radius' | 'outside_zone' | 'missing_branch_coordinates' | 'missing_location'
  distanceKm: number | null
}

const EARTH_RADIUS_KM = 6371

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

export function haversineDistanceKm(from: LatLng, to: LatLng): number {
  const dLat = toRadians(to.lat - from.lat)
  const dLng = toRadians(to.lng - from.lng)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

function normalizePolygonCoordinates(value: unknown): LatLng[] {
  if (!Array.isArray(value)) {
    return []
  }

  const points = value
    .map((point) => {
      if (!point || typeof point !== 'object') {
        return null
      }

      const record = point as Record<string, unknown>
      const lat = Number(record.lat)
      const lng = Number(record.lng)

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null
      }

      return { lat, lng }
    })
    .filter((point): point is LatLng => Boolean(point))

  return points.length >= 3 ? points : []
}

export function isPointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  if (polygon.length < 3) {
    return false
  }

  let isInside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng
    const yi = polygon[i].lat
    const xj = polygon[j].lng
    const yj = polygon[j].lat

    const intersects = yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi

    if (intersects) {
      isInside = !isInside
    }
  }

  return isInside
}

export function findNearestBranch(
  location: LatLng,
  branches: BranchWithGeo[],
): { branch: BranchWithGeo; distanceKm: number } | null {
  const withCoordinates = branches.filter(
    (branch) => Number.isFinite(branch.latitude) && Number.isFinite(branch.longitude),
  )

  if (withCoordinates.length === 0) {
    return null
  }

  let nearest: { branch: BranchWithGeo; distanceKm: number } | null = null

  for (const branch of withCoordinates) {
    const distanceKm = haversineDistanceKm(location, {
      lat: Number(branch.latitude),
      lng: Number(branch.longitude),
    })

    if (!nearest || distanceKm < nearest.distanceKm) {
      nearest = { branch, distanceKm }
    }
  }

  return nearest
}

export function checkDeliveryCoverage(
  branch: BranchWithGeo | null,
  location: LatLng | null,
  preferredAreaName?: string,
): DeliveryCoverageResult {
  if (!location) {
    return {
      isAvailable: false,
      reason: 'missing_location',
      distanceKm: null,
    }
  }

  if (!branch || !Number.isFinite(branch.latitude) || !Number.isFinite(branch.longitude)) {
    return {
      isAvailable: false,
      reason: 'missing_branch_coordinates',
      distanceKm: null,
    }
  }

  const distanceKm = haversineDistanceKm(location, {
    lat: Number(branch.latitude),
    lng: Number(branch.longitude),
  })

  const activeAreas = (branch.delivery_areas || []).filter((area) => area?.is_active !== false)
  const scopedAreas = preferredAreaName
    ? activeAreas.filter((area) => (area.area_name || '').trim().toLowerCase() === preferredAreaName.trim().toLowerCase())
    : activeAreas
  const polygonSource = scopedAreas.length > 0 ? scopedAreas : activeAreas

  const polygons = polygonSource
    .map((area) => normalizePolygonCoordinates(area?.polygon_coordinates))
    .filter((polygon) => polygon.length >= 3)

  if (polygons.length > 0) {
    const insidePolygon = polygons.some((polygon) => isPointInPolygon(location, polygon))
    return {
      isAvailable: insidePolygon,
      reason: insidePolygon ? 'inside_polygon' : 'outside_zone',
      distanceKm,
    }
  }

  const deliveryRadius = Number(branch.delivery_radius)
  if (Number.isFinite(deliveryRadius) && deliveryRadius > 0) {
    const insideRadius = distanceKm <= deliveryRadius
    return {
      isAvailable: insideRadius,
      reason: insideRadius ? 'inside_radius' : 'outside_zone',
      distanceKm,
    }
  }

  return {
    isAvailable: false,
    reason: 'outside_zone',
    distanceKm,
  }
}
