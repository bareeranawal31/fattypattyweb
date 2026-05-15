"use client"

import { useEffect, useState } from 'react'

export type CouponType = 'percentage' | 'fixed'

export interface AdminCoupon {
  id: string
  code: string
  type: CouponType
  value: number
  isActive: boolean
}

export interface AdminSettings {
  storeName: string
  storePhone: string
  storeEmail: string
  deliveryFee: number
  minOrderAmount: number
  estimatedDeliveryTime: string
  estimatedPickupTime: string
  isAcceptingOrders: boolean
  isDeliveryEnabled: boolean
  isPickupEnabled: boolean
  isLoyaltyPaused: boolean
  coupons: AdminCoupon[]
}

export const SETTINGS_STORAGE_KEY = 'adminSettings'

export const defaultAdminSettings: AdminSettings = {
  storeName: 'Fatty Patty',
  storePhone: '+92 300 123 4567',
  storeEmail: 'orders@fattypatty.pk',
  deliveryFee: 150,
  minOrderAmount: 500,
  estimatedDeliveryTime: '35-45',
  estimatedPickupTime: '15-20',
  isAcceptingOrders: true,
  isDeliveryEnabled: true,
  isPickupEnabled: true,
  isLoyaltyPaused: false,
  coupons: [
    { id: 'c1', code: 'SAVE10', type: 'percentage', value: 10, isActive: true },
    { id: 'c2', code: 'WELCOME100', type: 'fixed', value: 100, isActive: true },
    { id: 'c3', code: 'FP50', type: 'fixed', value: 50, isActive: true },
  ],
}

export function parseAdminSettings(raw: string | null): AdminSettings {
  if (!raw) {
    return defaultAdminSettings
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AdminSettings>
    return {
      ...defaultAdminSettings,
      ...parsed,
      coupons: parsed.coupons && parsed.coupons.length > 0 ? parsed.coupons : defaultAdminSettings.coupons,
      isLoyaltyPaused: parsed.isLoyaltyPaused ?? defaultAdminSettings.isLoyaltyPaused,
    }
  } catch {
    return defaultAdminSettings
  }
}

export function readAdminSettings(): AdminSettings {
  if (typeof window === 'undefined') {
    return defaultAdminSettings
  }

  return parseAdminSettings(localStorage.getItem(SETTINGS_STORAGE_KEY))
}

export function useAdminSettings() {
  const [settings, setSettings] = useState<AdminSettings>(defaultAdminSettings)

  useEffect(() => {
    const sync = () => {
      setSettings(readAdminSettings())
    }

    sync()
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  return settings
}