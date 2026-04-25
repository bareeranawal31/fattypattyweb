"use client"

import { useEffect, useMemo, useState } from 'react'
import { GoogleMap, DrawingManagerF, MarkerF, PolygonF } from '@react-google-maps/api'
import { Loader2, MapPin, Save } from 'lucide-react'
import { toast } from '@/lib/notify'
import { LocationMap } from '@/components/location-map'
import { useGoogleMaps } from '@/hooks/use-google-maps'
import type { LatLng } from '@/lib/location-utils'

interface Branch {
  id: string
  name: string
  address: string
  city?: string | null
  latitude?: number | null
  longitude?: number | null
  delivery_radius?: number | null
  is_active?: boolean
  accepts_pickup?: boolean
  accepts_delivery?: boolean
}

interface DeliveryArea {
  id: string
  branch_id: string
  area_name: string
  delivery_fee: number
  min_order_amount: number
  estimated_time_minutes: number
  is_active: boolean
  polygon_coordinates?: LatLng[] | null
  branch?: { id: string; name: string; address: string }
}

function toNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function isValidLatLng(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

export default function AdminBranchesPage() {
  const { hasApiKey, isLoaded, loadError } = useGoogleMaps()
  const [branches, setBranches] = useState<Branch[]>([])
  const [areas, setAreas] = useState<DeliveryArea[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingBranch, setIsSavingBranch] = useState(false)
  const [isSavingArea, setIsSavingArea] = useState(false)

  const [branchForm, setBranchForm] = useState({
    id: '',
    name: '',
    address: '',
    city: 'Karachi',
    latitude: '',
    longitude: '',
    delivery_radius: '5',
  })

  const [areaForm, setAreaForm] = useState({
    id: '',
    branch_id: '',
    area_name: '',
    delivery_fee: '0',
    min_order_amount: '0',
    estimated_time_minutes: '40',
    is_active: true,
  })

  const [draftPolygon, setDraftPolygon] = useState<LatLng[]>([])
  const [polygonJson, setPolygonJson] = useState('')

  const selectedBranchForMap = useMemo(() => {
    const lat = Number(branchForm.latitude)
    const lng = Number(branchForm.longitude)
    if (!isValidLatLng(lat, lng)) {
      return null
    }
    return { lat, lng }
  }, [branchForm.latitude, branchForm.longitude])

  const selectedBranchAreas = useMemo(
    () => areas.filter((area) => area.branch_id === areaForm.branch_id),
    [areas, areaForm.branch_id],
  )

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [branchesRes, areasRes] = await Promise.all([
        fetch('/api/admin/branches', { cache: 'no-store' }),
        fetch('/api/admin/delivery-areas', { cache: 'no-store' }),
      ])

      const [branchesJson, areasJson] = await Promise.all([branchesRes.json(), areasRes.json()])

      if (branchesRes.ok && Array.isArray(branchesJson.data)) {
        setBranches(branchesJson.data as Branch[])
      }
      if (areasRes.ok && Array.isArray(areasJson.data)) {
        const normalized = (areasJson.data as DeliveryArea[]).map((area) => ({
          ...area,
          polygon_coordinates: Array.isArray(area.polygon_coordinates)
            ? area.polygon_coordinates
            : null,
        }))
        setAreas(normalized)
      }
    } catch {
      toast.error('Failed to load branch and delivery area data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setPolygonJson(draftPolygon.length > 0 ? JSON.stringify(draftPolygon, null, 2) : '')
  }, [draftPolygon])

  const resetBranchForm = () => {
    setBranchForm({
      id: '',
      name: '',
      address: '',
      city: 'Karachi',
      latitude: '',
      longitude: '',
      delivery_radius: '5',
    })
  }

  const resetAreaForm = () => {
    setAreaForm({
      id: '',
      branch_id: areaForm.branch_id,
      area_name: '',
      delivery_fee: '0',
      min_order_amount: '0',
      estimated_time_minutes: '40',
      is_active: true,
    })
    setDraftPolygon([])
    setPolygonJson('')
  }

  const submitBranch = async (e: React.FormEvent) => {
    e.preventDefault()

    const lat = Number(branchForm.latitude)
    const lng = Number(branchForm.longitude)
    if (!isValidLatLng(lat, lng)) {
      toast.error('Please enter valid latitude and longitude values')
      return
    }

    const radius = Number(branchForm.delivery_radius)
    if (!Number.isFinite(radius) || radius <= 0) {
      toast.error('Delivery radius must be greater than 0')
      return
    }

    setIsSavingBranch(true)
    try {
      const payload = {
        name: branchForm.name,
        address: branchForm.address,
        city: branchForm.city,
        latitude: lat,
        longitude: lng,
        delivery_radius: radius,
      }

      const endpoint = branchForm.id
        ? `/api/admin/branches/${branchForm.id}`
        : '/api/admin/branches'

      const method = branchForm.id ? 'PUT' : 'POST'

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to save branch')
      }

      toast.success(branchForm.id ? 'Branch updated' : 'Branch created')
      resetBranchForm()
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save branch')
    } finally {
      setIsSavingBranch(false)
    }
  }

  const editBranch = (branch: Branch) => {
    setBranchForm({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      city: branch.city || 'Karachi',
      latitude: branch.latitude != null ? String(branch.latitude) : '',
      longitude: branch.longitude != null ? String(branch.longitude) : '',
      delivery_radius: branch.delivery_radius != null ? String(branch.delivery_radius) : '5',
    })
  }

  const deleteBranch = async (id: string) => {
    if (!window.confirm('Delete this branch and related delivery areas?')) {
      return
    }

    try {
      const res = await fetch(`/api/admin/branches/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to delete branch')
      }
      toast.success('Branch deleted')
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete branch')
    }
  }

  const submitArea = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!areaForm.branch_id) {
      toast.error('Please select a branch for this delivery area')
      return
    }

    let polygon = draftPolygon

    if (polygon.length === 0 && polygonJson.trim()) {
      try {
        const parsed = JSON.parse(polygonJson) as LatLng[]
        if (!Array.isArray(parsed) || parsed.length < 3) {
          throw new Error('Polygon must have at least 3 points')
        }
        polygon = parsed
      } catch {
        toast.error('Polygon JSON is invalid')
        return
      }
    }

    if (polygon.length > 0 && polygon.length < 3) {
      toast.error('Polygon must contain at least 3 points')
      return
    }

    setIsSavingArea(true)
    try {
      const payload = {
        branch_id: areaForm.branch_id,
        area_name: areaForm.area_name,
        delivery_fee: toNumber(areaForm.delivery_fee),
        min_order_amount: toNumber(areaForm.min_order_amount),
        estimated_time_minutes: toNumber(areaForm.estimated_time_minutes),
        is_active: areaForm.is_active,
        polygon_coordinates: polygon.length > 0 ? polygon : null,
      }

      const endpoint = areaForm.id
        ? `/api/admin/delivery-areas/${areaForm.id}`
        : '/api/admin/delivery-areas'
      const method = areaForm.id ? 'PUT' : 'POST'

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to save delivery area')
      }

      toast.success(areaForm.id ? 'Delivery area updated' : 'Delivery area created')
      resetAreaForm()
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save delivery area')
    } finally {
      setIsSavingArea(false)
    }
  }

  const editArea = (area: DeliveryArea) => {
    setAreaForm({
      id: area.id,
      branch_id: area.branch_id,
      area_name: area.area_name,
      delivery_fee: String(area.delivery_fee || 0),
      min_order_amount: String(area.min_order_amount || 0),
      estimated_time_minutes: String(area.estimated_time_minutes || 40),
      is_active: area.is_active,
    })
    setDraftPolygon(Array.isArray(area.polygon_coordinates) ? area.polygon_coordinates : [])
  }

  const deleteArea = async (id: string) => {
    if (!window.confirm('Delete this delivery area?')) {
      return
    }

    try {
      const res = await fetch(`/api/admin/delivery-areas/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to delete delivery area')
      }
      toast.success('Delivery area deleted')
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete delivery area')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Branches & Delivery Zones</h1>
        <p className="text-sm text-muted-foreground">Manage branch geo coordinates, radius, and polygon delivery areas.</p>
      </div>

      {isLoading ? (
        <div className="flex h-56 items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="h-6 w-6 animate-spin text-brand-red" />
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 text-lg font-semibold text-foreground">{branchForm.id ? 'Edit Branch' : 'Add Branch'}</h2>
              <form onSubmit={submitBranch} className="space-y-3">
                <input
                  required
                  value={branchForm.name}
                  onChange={(e) => setBranchForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Branch name"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  required
                  value={branchForm.address}
                  onChange={(e) => setBranchForm((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Branch address"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-3 gap-3">
                  <input
                    value={branchForm.city}
                    onChange={(e) => setBranchForm((prev) => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <input
                    required
                    type="number"
                    step="any"
                    value={branchForm.latitude}
                    onChange={(e) => setBranchForm((prev) => ({ ...prev, latitude: e.target.value }))}
                    placeholder="Latitude"
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <input
                    required
                    type="number"
                    step="any"
                    value={branchForm.longitude}
                    onChange={(e) => setBranchForm((prev) => ({ ...prev, longitude: e.target.value }))}
                    placeholder="Longitude"
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <input
                  required
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={branchForm.delivery_radius}
                  onChange={(e) => setBranchForm((prev) => ({ ...prev, delivery_radius: e.target.value }))}
                  placeholder="Delivery radius (km)"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />

                <div className="rounded-lg border border-border p-2">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Map picker (click map to set branch coordinates)</p>
                  <LocationMap
                    branches={branches.map((branch) => ({
                      id: branch.id,
                      name: branch.name,
                      address: branch.address,
                      latitude: branch.latitude,
                      longitude: branch.longitude,
                    }))}
                    selectedLocation={selectedBranchForMap}
                    center={selectedBranchForMap}
                    allowLocationPick
                    onLocationSelect={(location) => {
                      setBranchForm((prev) => ({
                        ...prev,
                        latitude: String(location.lat),
                        longitude: String(location.lng),
                      }))
                    }}
                    height={220}
                    className="rounded-md"
                    fallbackQuery={branchForm.address || 'Karachi'}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSavingBranch}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {isSavingBranch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {branchForm.id ? 'Update Branch' : 'Create Branch'}
                  </button>
                  {branchForm.id && (
                    <button
                      type="button"
                      onClick={resetBranchForm}
                      className="rounded-lg border border-border px-4 py-2 text-sm"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Existing Branches</h2>
              {branches.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                  No branches yet. Add your first branch.
                </p>
              ) : (
                <div className="space-y-2">
                  {branches.map((branch) => (
                    <div key={branch.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{branch.name}</p>
                          <p className="text-xs text-muted-foreground">{branch.address}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {branch.latitude ?? '-'}, {branch.longitude ?? '-'} | Radius: {branch.delivery_radius ?? '-'} km
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => editBranch(branch)}
                            className="rounded-md border border-border px-2 py-1 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteBranch(branch.id)}
                            className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-brand-red" />
              <h2 className="text-lg font-semibold text-foreground">Delivery Areas (Polygons)</h2>
            </div>

            <form onSubmit={submitArea} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <select
                  required
                  value={areaForm.branch_id}
                  onChange={(e) => setAreaForm((prev) => ({ ...prev, branch_id: e.target.value }))}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
                <input
                  required
                  value={areaForm.area_name}
                  onChange={(e) => setAreaForm((prev) => ({ ...prev, area_name: e.target.value }))}
                  placeholder="Area name"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={areaForm.estimated_time_minutes}
                  onChange={(e) => setAreaForm((prev) => ({ ...prev, estimated_time_minutes: e.target.value }))}
                  placeholder="ETA (minutes)"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={areaForm.delivery_fee}
                  onChange={(e) => setAreaForm((prev) => ({ ...prev, delivery_fee: e.target.value }))}
                  placeholder="Delivery fee"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={areaForm.min_order_amount}
                  onChange={(e) => setAreaForm((prev) => ({ ...prev, min_order_amount: e.target.value }))}
                  placeholder="Min order amount"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={areaForm.is_active}
                    onChange={(e) => setAreaForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  />
                  Active area
                </label>
              </div>

              <div className="rounded-lg border border-border p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Draw polygon on map (click map and finish shape). You can also paste JSON manually.
                </p>

                {!hasApiKey || loadError || !isLoaded ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                    Google Maps drawing tools unavailable. Use polygon JSON textarea below.
                  </p>
                ) : (
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: 260 }}
                    center={selectedBranchForMap || { lat: 24.8607, lng: 67.0011 }}
                    zoom={12}
                    options={{ disableDefaultUI: true, zoomControl: true }}
                  >
                    {selectedBranchForMap && <MarkerF position={selectedBranchForMap} />}

                    <DrawingManagerF
                      options={{
                        drawingControl: true,
                        drawingControlOptions: {
                          drawingModes: [window.google.maps.drawing.OverlayType.POLYGON],
                        },
                        polygonOptions: {
                          editable: true,
                          draggable: false,
                          fillOpacity: 0.25,
                          strokeWeight: 2,
                        },
                      }}
                      onPolygonComplete={(polygon) => {
                        const path = polygon.getPath().getArray().map((point) => ({
                          lat: point.lat(),
                          lng: point.lng(),
                        }))
                        setDraftPolygon(path)
                        polygon.setMap(null)
                      }}
                    />

                    {selectedBranchAreas.map((area) => (
                      <PolygonF
                        key={area.id}
                        paths={Array.isArray(area.polygon_coordinates) ? area.polygon_coordinates : []}
                        options={{
                          fillColor: '#16a34a',
                          fillOpacity: 0.15,
                          strokeColor: '#16a34a',
                          strokeWeight: 1,
                        }}
                      />
                    ))}

                    {draftPolygon.length >= 3 && (
                      <PolygonF
                        paths={draftPolygon}
                        options={{
                          fillColor: '#C1121F',
                          fillOpacity: 0.25,
                          strokeColor: '#C1121F',
                          strokeWeight: 2,
                        }}
                      />
                    )}
                  </GoogleMap>
                )}

                <textarea
                  rows={6}
                  value={polygonJson}
                  onChange={(e) => {
                    setPolygonJson(e.target.value)
                    try {
                      const parsed = JSON.parse(e.target.value) as LatLng[]
                      if (Array.isArray(parsed)) {
                        setDraftPolygon(parsed)
                      }
                    } catch {
                      // Allow temporary invalid JSON while typing.
                    }
                  }}
                  placeholder='[{"lat":24.8607,"lng":67.0011},{"lat":24.8611,"lng":67.0122},{"lat":24.8501,"lng":67.0105}]'
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={isSavingArea}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {isSavingArea ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {areaForm.id ? 'Update Area' : 'Create Area'}
                </button>
                <button
                  type="button"
                  onClick={resetAreaForm}
                  className="rounded-lg border border-border px-4 py-2 text-sm"
                >
                  Reset
                </button>
              </div>
            </form>

            <div className="mt-5 space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Existing Delivery Areas</h3>
              {areas.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                  No delivery areas configured.
                </p>
              ) : (
                areas.map((area) => (
                  <div key={area.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{area.area_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Branch: {branches.find((branch) => branch.id === area.branch_id)?.name || area.branch_id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Polygon points: {Array.isArray(area.polygon_coordinates) ? area.polygon_coordinates.length : 0}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => editArea(area)}
                          className="rounded-md border border-border px-2 py-1 text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteArea(area.id)}
                          className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
