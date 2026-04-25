"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import {
  branches as fallbackBranches,
  deliveryAreas as fallbackDeliveryAreas,
} from '@/lib/service-areas'

export type OrderType = 'delivery' | 'pickup'
export type Branch = string

export interface BranchOption {
  id: string
  name: string
  address: string
  city?: string | null
  latitude?: number | null
  longitude?: number | null
  delivery_radius?: number | null
  delivery_areas?: Array<{
    id?: string
    area_name?: string
    is_active?: boolean
    polygon_coordinates?: unknown
  }>
}

interface BranchApiRow {
  id?: string
  name?: string
  address?: string
  city?: string | null
  latitude?: number | null
  longitude?: number | null
  delivery_radius?: number | null
  delivery_areas?: Array<{ area_name?: string; is_active?: boolean }>
}

const defaultBranchOptions: BranchOption[] = fallbackBranches.map((branch) => ({
  id: branch.id,
  name: branch.name,
  address: branch.address,
  latitude: null,
  longitude: null,
  delivery_radius: null,
  delivery_areas: [],
}))

export const branches = defaultBranchOptions
export const deliveryAreas = fallbackDeliveryAreas

const STORAGE_KEY = 'fatty-patty-order'

function loadPersistedState() {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as {
      orderType: OrderType
      selectedArea: string
      selectedBranch: Branch | null
      hasCompletedSetup: boolean
    }
  } catch {
    return null
  }
}

function persistState(data: {
  orderType: OrderType
  selectedArea: string
  selectedBranch: Branch | null
  hasCompletedSetup: boolean
}) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // ignore storage errors
  }
}

interface OrderContextType {
  orderType: OrderType
  setOrderType: (type: OrderType) => void
  deliveryAreas: string[]
  branches: BranchOption[]
  selectedArea: string
  setSelectedArea: (area: string) => void
  selectedBranch: Branch | null
  setSelectedBranch: (branch: Branch | null) => void
  hasCompletedSetup: boolean
  setHasCompletedSetup: (done: boolean) => void
  isHydrated: boolean
}

const OrderContext = createContext<OrderContextType | undefined>(undefined)

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orderType, setOrderTypeState] = useState<OrderType>('delivery')
  const [deliveryAreaOptions, setDeliveryAreaOptions] = useState<string[]>(fallbackDeliveryAreas)
  const [branchOptions, setBranchOptions] = useState<BranchOption[]>(defaultBranchOptions)
  const [selectedArea, setSelectedAreaState] = useState('')
  const [selectedBranch, setSelectedBranchState] = useState<Branch | null>(null)
  const [hasCompletedSetup, setHasCompletedSetupState] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    let isCancelled = false

    const loadLocationOptions = async () => {
      try {
        const response = await fetch('/api/branches', { cache: 'no-store' })
        const result = await response.json()

        if (!response.ok || !Array.isArray(result.data) || isCancelled) {
          return
        }

        const fetchedBranches: BranchOption[] = []
        for (const branch of result.data as BranchApiRow[]) {
          if (!branch.id || !branch.name) {
            continue
          }

          const fallbackAddress = branch.city?.trim() ? `${branch.name}, ${branch.city}` : branch.name
          fetchedBranches.push({
            id: branch.id,
            name: branch.name,
            address: branch.address?.trim() || fallbackAddress,
            city: branch.city || null,
            latitude: Number.isFinite(branch.latitude) ? Number(branch.latitude) : null,
            longitude: Number.isFinite(branch.longitude) ? Number(branch.longitude) : null,
            delivery_radius: Number.isFinite(branch.delivery_radius) ? Number(branch.delivery_radius) : null,
            delivery_areas: Array.isArray(branch.delivery_areas)
              ? branch.delivery_areas.map((area) => ({
                  area_name: area.area_name,
                  is_active: area.is_active,
                  polygon_coordinates: (area as { polygon_coordinates?: unknown }).polygon_coordinates,
                }))
              : [],
          })
        }

        if (fetchedBranches.length > 0) {
          setBranchOptions(fetchedBranches)
        }

        const fetchedAreas = Array.from(
          new Set(
            (result.data as BranchApiRow[])
              .flatMap((branch) => branch.delivery_areas || [])
              .filter((area) => area.is_active !== false)
              .map((area) => area.area_name?.trim() || '')
              .filter(Boolean),
          ),
        )

        if (fetchedAreas.length > 0) {
          setDeliveryAreaOptions(fetchedAreas)
        }
      } catch {
        // keep fallback options if API is unavailable
      }
    }

    loadLocationOptions()

    return () => {
      isCancelled = true
    }
  }, [])

  // On mount, restore persisted state from sessionStorage
  useEffect(() => {
    const persisted = loadPersistedState()
    if (persisted) {
      setOrderTypeState(persisted.orderType)
      setSelectedAreaState(persisted.selectedArea)
      setSelectedBranchState(persisted.selectedBranch)
      setHasCompletedSetupState(persisted.hasCompletedSetup)
    }
    setIsHydrated(true)
  }, [])

  // Persist state changes to sessionStorage
  useEffect(() => {
    if (!isHydrated) return
    persistState({ orderType, selectedArea, selectedBranch, hasCompletedSetup })
  }, [orderType, selectedArea, selectedBranch, hasCompletedSetup, isHydrated])

  const setOrderType = useCallback((type: OrderType) => setOrderTypeState(type), [])
  const setSelectedArea = useCallback((area: string) => setSelectedAreaState(area), [])
  const setSelectedBranch = useCallback((branch: Branch | null) => setSelectedBranchState(branch), [])
  const setHasCompletedSetup = useCallback((done: boolean) => setHasCompletedSetupState(done), [])

  useEffect(() => {
    if (!selectedArea || deliveryAreaOptions.includes(selectedArea)) {
      return
    }
    setSelectedAreaState('')
  }, [deliveryAreaOptions, selectedArea])

  useEffect(() => {
    if (!selectedBranch || branchOptions.some((branch) => branch.id === selectedBranch)) {
      return
    }
    setSelectedBranchState(null)
  }, [branchOptions, selectedBranch])

  return (
    <OrderContext.Provider
      value={{
        orderType,
        setOrderType,
        deliveryAreas: deliveryAreaOptions,
        branches: branchOptions,
        selectedArea,
        setSelectedArea,
        selectedBranch,
        setSelectedBranch,
        hasCompletedSetup,
        setHasCompletedSetup,
        isHydrated,
      }}
    >
      {children}
    </OrderContext.Provider>
  )
}

export function useOrder() {
  const context = useContext(OrderContext)
  if (!context) {
    throw new Error('useOrder must be used within an OrderProvider')
  }
  return context
}
