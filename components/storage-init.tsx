"use client"

import { useEffect } from 'react'
import { migrateStorageData } from '@/lib/data-migration'

/**
 * This component runs on app initialization to migrate legacy storage keys
 * to the new global keys (menuItems, deals, orders)
 */
export function StorageInit() {
  useEffect(() => {
    migrateStorageData()
  }, [])

  return null
}
